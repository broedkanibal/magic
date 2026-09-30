#!/usr/bin/env python3
"""MES-288 grind 2: tränar kortdetektorn (YOLOX-tiny och YOLOX-nano, Megvii, Apache-2.0) på Kaggle.

Körs som en Kaggle-kernel (script) med GPU (T4 × 2): hämtar YOLOX-koden och de COCO-förtränade
vikterna från Megvii:s GitHub, läser datasetet (dev/detektor/tran/dataset.py) och tränar två
modeller samtidigt, en per grafikkort. Samma fil går att köra lokalt på processorn för ett
rökprov (--lokal).

Två klasser: kort, baksida. Indata 960 × 544 (kamerans 16:9, kortsidan uppåt till en multipel
av 32); YOLOX tar rektangulär indata, ingen kvadratisk letterbox behövs.

**Ignorerade ytor.** YOLOX har inget för det, så förlusten maskas (IgnoreraHuvud nedan):
lådor med klass 2 i etiketterna är ignorerade ytor. De tas bort ur tilldelningen (SimOTA ser
bara riktiga lådor), och ankare vars mitt ligger i en ignorerad yta och som inte blivit
positiva för en riktig låda får vikten 0 i objektförlusten — varken positiva eller negativa.
Ett ankare som tilldelats en riktig låda inne i en ignorerad yta är positivt som vanligt
(en facit-låda inne i en ignorerad yta är fortfarande facit).

    python mesa_detektor_tran.py                         # på Kaggle: båda modellerna, en per GPU
    python mesa_detektor_tran.py --modell yolox_tiny --gpu 0 --timmar 3.0
    python mesa_detektor_tran.py --lokal --data <mapp> --yolox <YOLOX-main> --vikter <mapp> --modell yolox_nano --iter 3
"""
import argparse, glob, json, math, os, random, subprocess, sys, time, types

import numpy as np

ARGS = None
KLASSER = ['kort', 'baksida']
IGN = 2          # klassnummer för en ignorerad yta i etiketterna
IN_H, IN_W = 544, 960
VIKT_URL = 'https://github.com/Megvii-BaseDetection/YOLOX/releases/download/0.1.1rc0/{}.pth'
KOD_URL = 'https://github.com/Megvii-BaseDetection/YOLOX.git'


def logg(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


# ── förberedelser på Kaggle ────────────────────────────────────────────────
def forbered_kaggle(arb):
    kod = os.path.join(arb, 'YOLOX')
    if not os.path.isdir(kod):
        subprocess.run(['git', 'clone', '--depth', '1', KOD_URL, kod], check=True)
    subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 'loguru', 'tabulate', 'thop', 'onnx', 'onnxruntime', 'onnxscript']   # onnxscript: torch.onnx.export på Kaggle kräver den (version 1 föll på exporten), check=False)
    vik = os.path.join(arb, 'vikter')
    os.makedirs(vik, exist_ok=True)
    for m in ('yolox_tiny', 'yolox_nano'):
        f = os.path.join(vik, m + '.pth')
        if not os.path.exists(f):
            subprocess.run(['wget', '-q', '-O', f, VIKT_URL.format(m)], check=True)
    return kod, vik


def hitta_data():
    kand = glob.glob('/kaggle/input/**/anteckningar.json', recursive=True)
    if not kand:
        raise SystemExit('hittar inte anteckningar.json under /kaggle/input')
    d = os.path.dirname(kand[0])
    if not os.path.isdir(os.path.join(d, 'bilder')):   # uppladdat som bilder.zip och inte uppackat av Kaggle
        z = glob.glob(os.path.join(d, 'bilder*.zip'))
        if not z:
            raise SystemExit(f'varken bilder/ eller bilder.zip i {d}')
        ny = '/kaggle/tmp/data'
        os.makedirs(ny, exist_ok=True)
        subprocess.run(['unzip', '-q', '-o', z[0], '-d', os.path.join(ny, 'bilder') if 'bilder/' not in subprocess.run(['unzip', '-l', z[0]], capture_output=True, text=True).stdout else ny], check=True)
        subprocess.run(['cp', kand[0], ny], check=True)
        d = ny
    logg(f'data: {d}')
    return d


# ── YOLOX ──────────────────────────────────────────────────────────────────
def importera_yolox(kod):
    sys.path.insert(0, kod)
    try:
        import pycocotools.coco  # noqa: F401
    except ImportError:   # yolox.data importerar COCODataset; vi använder den inte
        pc = types.ModuleType('pycocotools')
        pcc = types.ModuleType('pycocotools.coco')
        pcc.COCO = object
        pc.coco = pcc
        sys.modules['pycocotools'] = pc
        sys.modules['pycocotools.coco'] = pcc


def bygg_modell(namn):
    import torch.nn as nn
    from yolox.models import YOLOX, YOLOPAFPN, YOLOXHead

    class IgnoreraHuvud(YOLOXHead):
        """YOLOXHead där etiketter med klass IGN är ignorerade ytor (se modulens docstring)."""

        def get_losses(self, imgs, x_shifts, y_shifts, expanded_strides, labels, outputs, origin_preds, dtype):
            import torch
            import torch.nn.functional as F
            B, A = outputs.shape[0], outputs.shape[1]
            xs = torch.cat(x_shifts, 1)[0]
            ys = torch.cat(y_shifts, 1)[0]
            st = torch.cat(expanded_strides, 1)[0]
            cx, cy = (xs + 0.5) * st, (ys + 0.5) * st
            giltig = labels.sum(dim=2) > 0
            rena = torch.zeros_like(labels)
            ign_mask = torch.zeros((B, A), dtype=torch.bool, device=outputs.device)
            for b in range(B):
                rad = labels[b][giltig[b]]
                ar_ign = rad[:, 0] == IGN
                r = rad[~ar_ign]
                rena[b, :len(r)] = r
                ig = rad[ar_ign]
                if len(ig):
                    x0, x1 = ig[:, 1] - ig[:, 3] / 2, ig[:, 1] + ig[:, 3] / 2
                    y0, y1 = ig[:, 2] - ig[:, 4] / 2, ig[:, 2] + ig[:, 4] / 2
                    inne = (cx[None] > x0[:, None]) & (cx[None] < x1[:, None]) & (cy[None] > y0[:, None]) & (cy[None] < y1[:, None])
                    ign_mask[b] = inne.any(0)
            self._ign_mask = ign_mask
            return self._losses(imgs, x_shifts, y_shifts, expanded_strides, rena, outputs, origin_preds, dtype, ign_mask)

        def _losses(self, imgs, x_shifts, y_shifts, expanded_strides, labels, outputs, origin_preds, dtype, ign_mask):
            # YOLOXHead.get_losses (YOLOX 0.3.0) med en ändring: objektförlusten viktas med ign_vikt
            import torch
            import torch.nn.functional as F
            bbox_preds = outputs[:, :, :4]
            obj_preds = outputs[:, :, 4:5]
            cls_preds = outputs[:, :, 5:]
            nlabel = (labels.sum(dim=2) > 0).sum(dim=1)
            total_num_anchors = outputs.shape[1]
            x_shifts = torch.cat(x_shifts, 1)
            y_shifts = torch.cat(y_shifts, 1)
            expanded_strides = torch.cat(expanded_strides, 1)
            if self.use_l1:
                origin_preds = torch.cat(origin_preds, 1)
            cls_targets, reg_targets, l1_targets, obj_targets, fg_masks = [], [], [], [], []
            num_fg, num_gts = 0.0, 0.0
            for batch_idx in range(outputs.shape[0]):
                num_gt = int(nlabel[batch_idx])
                num_gts += num_gt
                if num_gt == 0:
                    cls_target = outputs.new_zeros((0, self.num_classes))
                    reg_target = outputs.new_zeros((0, 4))
                    l1_target = outputs.new_zeros((0, 4))
                    obj_target = outputs.new_zeros((total_num_anchors, 1))
                    fg_mask = outputs.new_zeros(total_num_anchors).bool()
                else:
                    gt_bboxes_per_image = labels[batch_idx, :num_gt, 1:5]
                    gt_classes = labels[batch_idx, :num_gt, 0]
                    bboxes_preds_per_image = bbox_preds[batch_idx]
                    (gt_matched_classes, fg_mask, pred_ious_this_matching, matched_gt_inds, num_fg_img) = self.get_assignments(
                        batch_idx, num_gt, gt_bboxes_per_image, gt_classes, bboxes_preds_per_image,
                        expanded_strides, x_shifts, y_shifts, cls_preds, obj_preds)
                    num_fg += num_fg_img
                    cls_target = F.one_hot(gt_matched_classes.to(torch.int64), self.num_classes) * pred_ious_this_matching.unsqueeze(-1)
                    obj_target = fg_mask.unsqueeze(-1)
                    reg_target = gt_bboxes_per_image[matched_gt_inds]
                    if self.use_l1:
                        l1_target = self.get_l1_target(outputs.new_zeros((num_fg_img, 4)), gt_bboxes_per_image[matched_gt_inds],
                                                       expanded_strides[0][fg_mask], x_shifts=x_shifts[0][fg_mask], y_shifts=y_shifts[0][fg_mask])
                cls_targets.append(cls_target)
                reg_targets.append(reg_target)
                obj_targets.append(obj_target.to(dtype))
                fg_masks.append(fg_mask)
                if self.use_l1:
                    l1_targets.append(l1_target)
            cls_targets = torch.cat(cls_targets, 0)
            reg_targets = torch.cat(reg_targets, 0)
            obj_targets = torch.cat(obj_targets, 0)
            fg_masks = torch.cat(fg_masks, 0)
            if self.use_l1:
                l1_targets = torch.cat(l1_targets, 0)
            # ignorerat: ankare i en ignorerad yta som inte är positiva får vikten 0
            ign_vikt = 1.0 - (ign_mask.view(-1) & ~fg_masks).to(obj_preds.dtype)
            num_fg = max(num_fg, 1)
            loss_iou = (self.iou_loss(bbox_preds.view(-1, 4)[fg_masks], reg_targets)).sum() / num_fg
            loss_obj = (self.bcewithlog_loss(obj_preds.view(-1, 1), obj_targets) * ign_vikt.view(-1, 1)).sum() / num_fg
            loss_cls = (self.bcewithlog_loss(cls_preds.view(-1, self.num_classes)[fg_masks], cls_targets)).sum() / num_fg
            loss_l1 = (self.l1_loss(origin_preds.view(-1, 4)[fg_masks], l1_targets)).sum() / num_fg if self.use_l1 else 0.0
            reg_weight = 5.0
            loss = reg_weight * loss_iou + loss_obj + loss_cls + loss_l1
            return loss, reg_weight * loss_iou, loss_obj, loss_cls, loss_l1, num_fg / max(num_gts, 1)

    depth, width, dw = {'yolox_tiny': (0.33, 0.375, False), 'yolox_nano': (0.33, 0.25, True)}[namn]
    in_ch = [256, 512, 1024]
    backbone = YOLOPAFPN(depth, width, in_channels=in_ch, act='silu', depthwise=dw)
    head = IgnoreraHuvud(len(KLASSER), width, in_channels=in_ch, act='silu', depthwise=dw)
    model = YOLOX(backbone, head)
    for m in model.modules():
        if isinstance(m, nn.BatchNorm2d):
            m.eps, m.momentum = 1e-3, 0.03
    model.head.initialize_biases(1e-2)
    return model


def ladda_coco(model, fil):
    import torch
    ck = torch.load(fil, map_location='cpu')['model']
    egen = model.state_dict()
    ok = {k: v for k, v in ck.items() if k in egen and egen[k].shape == v.shape}
    model.load_state_dict(ok, strict=False)
    logg(f'COCO-vikter: {len(ok)} av {len(egen)} tensorer laddade (klasshuvudet börjar om: 2 klasser i stället för 80)')


# ── data ───────────────────────────────────────────────────────────────────
def gor_dataset(data, del_, cache=True):
    import cv2
    from yolox.data.datasets import Dataset

    ant = json.load(open(os.path.join(data, 'anteckningar.json'), encoding='utf-8'))['bilder']
    ant = [a for a in ant if a['del'] == del_]

    class Bord(Dataset):
        def __init__(self):
            super().__init__((IN_H, IN_W))
            self.ant = ant
            self.bytes = []
            if cache:   # jpeg-bytes i minnet (~0,5 GB), avkodas per ruta
                for a in ant:
                    with open(os.path.join(data, a['fil']), 'rb') as f:
                        self.bytes.append(np.frombuffer(f.read(), np.uint8))

        def __len__(self):
            return len(self.ant)

        def load_anno(self, i):
            a = self.ant[i]
            rad = [l[:4] + [l[4]] for l in a['lador']] + [l[:4] + [IGN] for l in a['ignorera']]
            return np.array(rad, np.float32).reshape(-1, 5)

        def pull_item(self, i):
            if self.bytes:
                img = cv2.imdecode(self.bytes[i], cv2.IMREAD_COLOR)
            else:
                img = cv2.imread(os.path.join(data, self.ant[i]['fil']))
            return img, self.load_anno(i).copy(), (img.shape[0], img.shape[1]), np.array([i])

        @Dataset.mosaic_getitem
        def __getitem__(self, i):
            img, lab, info, iid = self.pull_item(i)
            return img, lab, info, iid

    return Bord()


def gor_laddare(ds, batch, arbetare, mosaik=True):
    import torch
    from yolox.data import MosaicDetection, TrainTransform, YoloBatchSampler, InfiniteSampler, worker_init_reset_seed
    md = MosaicDetection(dataset=ds, mosaic=mosaik, img_size=(IN_H, IN_W),
                         preproc=TrainTransform(max_labels=200, flip_prob=0.5, hsv_prob=1.0),
                         degrees=10.0, translate=0.1, mosaic_scale=(0.5, 1.5), mixup_scale=(0.5, 1.5), shear=2.0,
                         enable_mixup=False, mosaic_prob=1.0 if mosaik else 0.0, mixup_prob=0.0)
    sampler = InfiniteSampler(len(md), seed=0)
    bs = YoloBatchSampler(sampler=sampler, batch_size=batch, drop_last=False, mosaic=mosaik)
    return torch.utils.data.DataLoader(md, batch_sampler=bs, num_workers=arbetare, pin_memory=True, worker_init_fn=worker_init_reset_seed)


# ── validering: enkel AP50 per klass, ignorerade ytor räknas inte som falska ──
def validera(model, ds, enhet, maxn=None):
    import cv2
    import torch
    from yolox.utils import postprocess
    model.eval()
    dets = {0: [], 1: []}
    ngt = {0: 0, 1: 0}
    n = len(ds) if maxn is None else min(maxn, len(ds))
    with torch.no_grad():
        for i in range(n):
            img, lab, _, _ = ds.pull_item(i)
            r = min(IN_H / img.shape[0], IN_W / img.shape[1])
            pad = np.full((IN_H, IN_W, 3), 114, np.uint8)
            im = cv2.resize(img, (int(img.shape[1] * r), int(img.shape[0] * r)))
            pad[:im.shape[0], :im.shape[1]] = im
            t = torch.from_numpy(pad.transpose(2, 0, 1).astype(np.float32))[None].to(enhet)
            ut = postprocess(model(t), len(KLASSER), 0.01, 0.6, class_agnostic=True)[0]
            gt = lab[lab[:, 4] != IGN]
            ign = lab[lab[:, 4] == IGN][:, :4]
            p = np.zeros((0, 7)) if ut is None else ut.float().cpu().numpy()
            if len(p):
                p[:, :4] /= r
            for c in (0, 1):
                g = gt[gt[:, 4] == c][:, :4]
                ngt[c] += len(g)
                pc = p[p[:, 6] == c]
                pc = pc[np.argsort(-(pc[:, 4] * pc[:, 5]))]
                tagen = np.zeros(len(g), bool)
                for d in pc:
                    s = d[4] * d[5]
                    if len(g):
                        xx0 = np.maximum(d[0], g[:, 0]); yy0 = np.maximum(d[1], g[:, 1])
                        xx1 = np.minimum(d[2], g[:, 2]); yy1 = np.minimum(d[3], g[:, 3])
                        inter = np.clip(xx1 - xx0, 0, None) * np.clip(yy1 - yy0, 0, None)
                        iou = inter / ((d[2] - d[0]) * (d[3] - d[1]) + (g[:, 2] - g[:, 0]) * (g[:, 3] - g[:, 1]) - inter + 1e-9)
                        iou[tagen] = -1
                        j = int(np.argmax(iou))
                        if iou[j] >= 0.5:
                            tagen[j] = True
                            dets[c].append((s, 1))
                            continue
                    mx, my = (d[0] + d[2]) / 2, (d[1] + d[3]) / 2
                    if len(ign) and np.any((mx > ign[:, 0]) & (mx < ign[:, 2]) & (my > ign[:, 1]) & (my < ign[:, 3])):
                        continue   # i en ignorerad yta: varken rätt eller fel
                    dets[c].append((s, 0))
    model.train()
    res = {}
    for c in (0, 1):
        d = sorted(dets[c], key=lambda x: -x[0])
        tp = np.cumsum([x[1] for x in d]) if d else np.zeros(0)
        fp = np.cumsum([1 - x[1] for x in d]) if d else np.zeros(0)
        rec = tp / max(ngt[c], 1)
        prec = tp / np.maximum(tp + fp, 1)
        ap = 0.0
        for tr in np.linspace(0, 1, 101):
            pr = prec[rec >= tr]
            ap += (pr.max() if len(pr) else 0) / 101
        s03 = [x for x in d if x[0] >= 0.3]
        res[KLASSER[c]] = {'ap50': round(float(ap), 4), 'gt': ngt[c], 'ratt@0.3': int(sum(x[1] for x in s03)), 'falska@0.3': int(sum(1 - x[1] for x in s03))}
    return res


# ── export ─────────────────────────────────────────────────────────────────
def exportera(model, fil):
    import torch
    m = model.eval().cpu()
    m.head.decode_in_inference = True
    x = torch.zeros(1, 3, IN_H, IN_W)
    torch.onnx.export(m, x, fil, input_names=['images'], output_names=['output'], opset_version=17, do_constant_folding=True)
    logg(f'ONNX: {fil} ({os.path.getsize(fil) / 1e6:.1f} MB)')
    try:
        import onnx
        from onnxruntime.transformers.float16 import convert_float_to_float16
        m16 = convert_float_to_float16(onnx.load(fil), keep_io_types=True)
        onnx.save(m16, fil.replace('.onnx', '_fp16.onnx'))
    except Exception as e:  # fp16 görs annars lokalt
        logg('fp16-exporten föll:', e)


# ── träningen ──────────────────────────────────────────────────────────────
def trana(a):
    import torch
    from yolox.utils import LRScheduler, ModelEMA
    enhet = torch.device(f'cuda:{a.gpu}' if torch.cuda.is_available() and not a.lokal else 'cpu')
    if enhet.type == 'cuda':
        torch.cuda.set_device(enhet)
    random.seed(a.fro); np.random.seed(a.fro); torch.manual_seed(a.fro)
    ut = os.path.join(a.ut, a.modell)
    os.makedirs(ut, exist_ok=True)
    model = bygg_modell(a.modell)
    ladda_coco(model, os.path.join(a.vikter, a.modell + '.pth'))
    model.to(enhet).train()
    trn = gor_dataset(a.data, 'trn', cache=not a.lokal)
    val = gor_dataset(a.data, 'val', cache=False)
    logg(f'{a.modell}: {len(trn)} träningsbilder, {len(val)} valideringsbilder, enhet {enhet}, batch {a.batch}')
    per_epok = math.ceil(len(trn) / a.batch)
    # optimerare som i YOLOX (SGD, nesterov, ingen viktminskning på BN och bias)
    pg0, pg1, pg2 = [], [], []
    for k, v in model.named_modules():
        if hasattr(v, 'bias') and isinstance(v.bias, torch.nn.Parameter):
            pg2.append(v.bias)
        if isinstance(v, torch.nn.BatchNorm2d) or 'bn' in k:
            pg0.append(v.weight)
        elif hasattr(v, 'weight') and isinstance(v.weight, torch.nn.Parameter):
            pg1.append(v.weight)
    lr = 0.01 / 64 * a.batch
    opt = torch.optim.SGD(pg0, lr=lr, momentum=0.9, nesterov=True)
    opt.add_param_group({'params': pg1, 'weight_decay': 5e-4})
    opt.add_param_group({'params': pg2})
    max_epok = a.epoker
    no_aug = max(2, round(max_epok * 0.1))
    sched = LRScheduler('yoloxwarmcos', lr, per_epok, max_epok, warmup_epochs=min(3, max_epok), warmup_lr_start=0, no_aug_epochs=no_aug, min_lr_ratio=0.05)
    ema = ModelEMA(model, 0.9998)
    scaler = torch.cuda.amp.GradScaler(enabled=enhet.type == 'cuda')
    laddare = gor_laddare(trn, a.batch, a.arbetare, mosaik=True)
    it_ = iter(laddare)
    storlekar = [(480, 864), (512, 896), (544, 960), (576, 1024), (608, 1088)]
    t0 = time.time()
    historik = []
    iter_tot = 0
    epok = 0
    mosaik = True
    while epok < max_epok:
        te = time.time()
        if mosaik and epok >= max_epok - no_aug:
            logg('sista epokerna utan mosaik')
            del it_, laddare
            laddare = gor_laddare(trn, a.batch, a.arbetare, mosaik=False)
            it_ = iter(laddare)
            mosaik = False
            model.head.use_l1 = True
        summa = {'tot': 0.0, 'iou': 0.0, 'obj': 0.0, 'cls': 0.0, 'n': 0}
        tsize = (IN_H, IN_W)
        for i in range(per_epok):
            if a.iter and i >= a.iter:
                break
            imgs, targets, _, _ = next(it_)
            imgs = imgs.to(enhet, non_blocking=True).float()
            targets = targets.to(enhet, non_blocking=True).float()
            if mosaik and iter_tot % 10 == 0:
                tsize = random.choice(storlekar)
            if tsize != (IN_H, IN_W):
                imgs = torch.nn.functional.interpolate(imgs, size=tsize, mode='bilinear', align_corners=False)
                targets[..., 1::2] *= tsize[1] / IN_W
                targets[..., 2::2] *= tsize[0] / IN_H
            with torch.autocast(device_type=enhet.type, enabled=enhet.type == 'cuda'):
                ut_ = model(imgs, targets)
            loss = ut_['total_loss']
            opt.zero_grad(set_to_none=True)
            scaler.scale(loss).backward()
            scaler.step(opt)
            scaler.update()
            ema.update(model)
            iter_tot += 1
            lr_n = sched.update_lr(iter_tot)
            for g in opt.param_groups:
                g['lr'] = lr_n
            summa['tot'] += float(loss); summa['iou'] += float(ut_['iou_loss']); summa['obj'] += float(ut_['conf_loss']); summa['cls'] += float(ut_['cls_loss']); summa['n'] += 1
            if i % 50 == 0:
                logg(f'{a.modell} epok {epok + 1}/{max_epok} iter {i}/{per_epok} förlust {float(loss):.3f} lr {lr_n:.5f} storlek {tsize}')
        tid_epok = time.time() - te
        epok += 1
        post = {'epok': epok, 'sek': round(tid_epok, 1), **{k: round(v / max(summa['n'], 1), 4) for k, v in summa.items() if k != 'n'}}
        # efter första epoken: anpassa antalet epoker efter tidsbudgeten
        if epok == 1 and a.timmar and not a.iter:
            ryms = int(a.timmar * 3600 / max(tid_epok * 1.05, 1))
            ny = max(5, min(a.epoker, ryms))
            if ny != max_epok:
                max_epok = ny
                no_aug = max(2, round(max_epok * 0.1))
                sched = LRScheduler('yoloxwarmcos', lr, per_epok, max_epok, warmup_epochs=min(3, max_epok), warmup_lr_start=0, no_aug_epochs=no_aug, min_lr_ratio=0.05)
                logg(f'epoken tog {tid_epok:.0f} s — {max_epok} epoker ryms i {a.timmar} h')
        if epok % a.val_var == 0 or epok == max_epok or a.iter:
            post['val'] = validera(ema.ema, val, enhet, maxn=a.valmax)
            torch.save({'model': ema.ema.state_dict(), 'epok': epok, 'modell': a.modell}, os.path.join(ut, 'senaste.pth'))
        historik.append(post)
        logg(json.dumps(post, ensure_ascii=False))
        with open(os.path.join(ut, 'historik.json'), 'w') as f:
            json.dump({'modell': a.modell, 'max_epok': max_epok, 'batch': a.batch, 'sek_totalt': round(time.time() - t0), 'epoker': historik}, f, indent=1)
    torch.save({'model': ema.ema.state_dict(), 'epok': epok, 'modell': a.modell}, os.path.join(ut, 'slut.pth'))
    exportera(ema.ema, os.path.join(ut, f'{a.modell}_mesa_{IN_W}x{IN_H}.onnx'))
    logg(f'{a.modell} klar på {(time.time() - t0) / 3600:.2f} h')


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--modell', default=None)
    p.add_argument('--gpu', type=int, default=0)
    p.add_argument('--lokal', action='store_true')
    p.add_argument('--data', default=None)
    p.add_argument('--yolox', default=None)
    p.add_argument('--vikter', default=None)
    p.add_argument('--ut', default='/kaggle/working/ut')
    p.add_argument('--batch', type=int, default=16)
    p.add_argument('--arbetare', type=int, default=2)
    p.add_argument('--epoker', type=int, default=150)
    p.add_argument('--timmar', type=float, default=3.0)
    p.add_argument('--iter', type=int, default=0)
    p.add_argument('--val-var', dest='val_var', type=int, default=10)
    p.add_argument('--valmax', type=int, default=None)
    p.add_argument('--fro', type=int, default=288)
    a = p.parse_args()
    if a.lokal:
        importera_yolox(a.yolox)
        trana(a)
        return
    arb = '/kaggle/working'
    kod, vik = forbered_kaggle('/kaggle/tmp' if os.path.isdir('/kaggle/tmp') else arb)
    data = a.data or hitta_data()
    if a.modell:   # en modell, i den här processen
        a.yolox, a.vikter, a.data = kod, vik, data
        importera_yolox(kod)
        trana(a)
        return
    # båda modellerna samtidigt, en per GPU
    import torch
    n = torch.cuda.device_count()
    logg(f'{n} GPU: {[torch.cuda.get_device_name(i) for i in range(n)]}')
    jobb = [('yolox_tiny', 0), ('yolox_nano', 1 if n > 1 else 0)]
    proc = []
    for m, g in jobb:
        cmd = [sys.executable, os.path.abspath(__file__), '--modell', m, '--gpu', str(g), '--data', data, '--ut', a.ut,
               '--batch', str(a.batch), '--arbetare', str(a.arbetare), '--epoker', str(a.epoker), '--timmar', str(a.timmar)]
        logf = open(os.path.join(arb, f'logg-{m}.txt'), 'w')
        proc.append((m, subprocess.Popen(cmd, stdout=logf, stderr=subprocess.STDOUT), logf))
        if n < 2:   # en GPU: en i taget
            proc[-1][1].wait()
    for m, pr, lf in proc:
        pr.wait()
        lf.close()
        logg(f'{m}: slutkod {pr.returncode}')
        print(open(os.path.join(arb, f'logg-{m}.txt')).read()[-4000:])


if __name__ == '__main__':
    main()
