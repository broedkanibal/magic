#!/usr/bin/env python3
"""Kör en färdig modell över nollprovets bilder och sparar ALLA detektioner
över en låg tröskel, så att trösklar och NMS kan prövas efteråt utan att
modellen körs om (rapport.py).

Kör:  python dev/detektor/kor.py --modell owlv2|gdino|yoloworld|mobilesam [--variant namn] [--original] [--bara 03,14]

  --original   kör originalfotona i högre upplösning (13, 14, 15) i 2×2
               överlappande rutor, i stället för golden-bilderna
  --bara       bara de fall som börjar så (för tröskelprovet)

Utdata: resultat/<modell>[-<variant>].json
  { modell, variant, licens, fragor, bilder: { <sökväg>: { id, W, H, ms, det: [[x0,y0,x1,y1,poäng,etikett], …] } } }
Lådor i andelar av bilden. ms = hela modellsteget per bild (förbehandling,
modell, efterbehandling), väggklocka på CPU, exklusive laddning.

Alla modeller körs på CPU (Jespers Intel-Mac saknar användbar GPU).
Trådar: torch får alla kärnor; kör med nice -n 19."""
import argparse, json, os, sys, time
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from facit import alla_fall, las_hogbank, FALLEN

HAR = os.path.dirname(os.path.abspath(__file__))
VIKTER = os.environ.get('VIKTER') or os.path.join(HAR, 'vikter')
LAG_TROSKEL = 0.02

p = argparse.ArgumentParser()
p.add_argument('--modell', required=True)
p.add_argument('--variant', default='')
p.add_argument('--original', action='store_true')
p.add_argument('--bara', default='')
p.add_argument('--bredd', type=int, default=0, help='skala om bilden till den här bredden före modellen (0 = som den är)')
p.add_argument('--rutor', type=int, default=1, help='dela bilden i N×N överlappande rutor och slå ihop')
p.add_argument('--fragor', default='', help='kommaseparerade textfrågor (open-vocabulary)')
p.add_argument('--imgsz', type=int, default=640, help='YOLO-Worlds indatastorlek')
p.add_argument('--bildfraga', default='', help='OWLv2: en bild på ett kort som fråga i stället för text (bildstyrd detektion)')
p.add_argument('--lag', type=float, default=0.02, help='golvtröskel: allt över sparas')
p.add_argument('--punkter', type=int, default=32, help='MobileSAM: punkter per sida i rutnätet för automatiska masker')
a = p.parse_args()
LAG_TROSKEL = a.lag

FRAGOR = [q.strip() for q in a.fragor.split(',') if q.strip()] or ['playing card', 'trading card', 'card', 'magic the gathering card']

# ── bilderna ──────────────────────────────────────────────────────────────
bilder = {}
fall = [f for f in alla_fall() if not a.bara or any(f['id'].startswith(b) for b in a.bara.split(','))]
if a.original:
    for f in fall:
        if f['original']: bilder[f['original']] = f['id'] + ' (original)'
else:
    for f in fall: bilder[f['bild']] = f['id']
    if not a.bara:
        for h in las_hogbank(): bilder.setdefault(h['bild'], os.path.basename(os.path.dirname(h['bild'])) if h['bild'].endswith('bild.jpg') else os.path.basename(h['bild']))
print(f'{len(bilder)} bilder, modell {a.modell}, frågor {FRAGOR}', flush=True)

# ── modellerna: var och en ger detekt(pil_bild) -> [[x0,y0,x1,y1,poäng,etikett], …] i pixlar ──
import torch
torch.set_grad_enabled(False)
# TRADAR=2 när golden kör samtidigt på datorn: då får den andra mätningen
# kvar sina kärnor. Tiden per bild blir då inte jämförbar med 4 trådar.
TRADAR = int(os.environ.get('TRADAR') or 0)
if TRADAR: torch.set_num_threads(TRADAR)
print(f'torch-trådar {torch.get_num_threads()}', flush=True)

def ladda(modell):
    if modell == 'owlv2':
        from transformers import Owlv2Processor, Owlv2ForObjectDetection
        proc = Owlv2Processor.from_pretrained('google/owlv2-base-patch16-ensemble')
        m = Owlv2ForObjectDetection.from_pretrained('google/owlv2-base-patch16-ensemble').eval()
        texter = [[f'a photo of a {q}' for q in FRAGOR]]
        if a.bildfraga:
            # bildstyrd detektion: "hitta det som liknar den här bilden" — en
            # kortbild som fråga, ingen text. Samma modell, ingen träning.
            fraga_im = Image.open(a.bildfraga).convert('RGB')
            def detekt(im):
                inp = proc(images=im, query_images=fraga_im, return_tensors='pt')
                out = m.image_guided_detection(**inp)
                s = max(im.size)
                res = proc.post_process_image_guided_detection(out, threshold=LAG_TROSKEL, nms_threshold=1.0, target_sizes=torch.tensor([[s, s]]))[0]
                return [[*b.tolist(), float(sc), 'bildfråga'] for b, sc in zip(res['boxes'], res['scores'])]
            return detekt, 'google/owlv2-base-patch16-ensemble, bildfråga ' + os.path.basename(a.bildfraga), 'Apache-2.0'
        def detekt(im):
            inp = proc(text=texter, images=im, return_tensors='pt')
            out = m(**inp)
            # OWLv2 fyller ut till kvadrat: målstorleken är den fyllda bildens
            s = max(im.size)
            res = proc.post_process_object_detection(out, threshold=LAG_TROSKEL, target_sizes=torch.tensor([[s, s]]))[0]
            return [[*b.tolist(), float(sc), FRAGOR[int(l)]] for b, sc, l in zip(res['boxes'], res['scores'], res['labels'])]
        return detekt, 'google/owlv2-base-patch16-ensemble', 'Apache-2.0'
    if modell == 'gdino':
        from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection
        proc = AutoProcessor.from_pretrained('IDEA-Research/grounding-dino-tiny')
        m = AutoModelForZeroShotObjectDetection.from_pretrained('IDEA-Research/grounding-dino-tiny').eval()
        text = '. '.join(FRAGOR) + '.'
        def detekt(im):
            inp = proc(images=im, text=text, return_tensors='pt')
            out = m(**inp)
            res = proc.post_process_grounded_object_detection(out, inp.input_ids, threshold=LAG_TROSKEL, text_threshold=LAG_TROSKEL, target_sizes=[im.size[::-1]])[0]
            etik = res.get('text_labels') or res.get('labels')
            return [[*b.tolist(), float(sc), str(l)] for b, sc, l in zip(res['boxes'], res['scores'], etik)]
        return detekt, 'IDEA-Research/grounding-dino-tiny', 'Apache-2.0'
    if modell == 'yoloworld':
        os.chdir(VIKTER)
        from ultralytics import YOLO
        m = YOLO('yolov8s-worldv2.pt')
        m.set_classes(FRAGOR)
        def detekt(im):
            r = m.predict(im, conf=LAG_TROSKEL, iou=0.9, max_det=300, verbose=False, imgsz=a.imgsz)[0]
            return [[*b.tolist(), float(c), FRAGOR[int(k)]] for b, c, k in zip(r.boxes.xyxy, r.boxes.conf, r.boxes.cls)]
        return detekt, f'ultralytics yolov8s-worldv2 (imgsz {a.imgsz})', 'AGPL-3.0 (CLIP-textkodaren MIT)'
    if modell == 'mobilesam':
        from mobile_sam import sam_model_registry, SamAutomaticMaskGenerator
        sam = sam_model_registry['vit_t'](checkpoint=os.path.join(VIKTER, 'MobileSAM-master', 'weights', 'mobile_sam.pt')).eval()
        gen = SamAutomaticMaskGenerator(sam, points_per_side=a.punkter, pred_iou_thresh=0.7, stability_score_thresh=0.8, min_mask_region_area=200)
        import cv2
        def detekt(im):
            arr = np.array(im.convert('RGB'))
            masker = gen.generate(arr)
            ut = []
            for mk in masker:
                x, y, w, h = mk['bbox']
                if w < 4 or h < 4: continue
                # kortlikhet: hur väl masken fyller sin minsta roterade rektangel,
                # och sidförhållandet på den rektangeln (kort = 0,716)
                seg = mk['segmentation'].astype(np.uint8)
                cnts, _ = cv2.findContours(seg, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                if not cnts: continue
                c = max(cnts, key=cv2.contourArea)
                (cx, cy), (rw, rh), ang = cv2.minAreaRect(c)
                if rw < 1 or rh < 1: continue
                fyll = float(cv2.contourArea(c)) / (rw * rh)
                kvot = min(rw, rh) / max(rw, rh)
                ut.append([x, y, x + w, y + h, float(mk['predicted_iou']), f'fyll={fyll:.2f} kvot={kvot:.2f} stab={mk["stability_score"]:.2f}'])
            return ut
        return detekt, f'ChaoningZhang/MobileSAM vit_t, automatiska masker {a.punkter}×{a.punkter} punkter', 'Apache-2.0'
    raise SystemExit('okänd modell ' + modell)

t = time.perf_counter()
detekt, namn, licens = ladda(a.modell)
print(f'laddad på {time.perf_counter() - t:.1f} s: {namn}', flush=True)

def kor_bild(im):
    """Hel bild, eller N×N rutor med 15 % överlapp som slås ihop (rå — NMS görs i rapporten)."""
    W, H = im.size
    if a.rutor <= 1: return detekt(im)
    n = a.rutor; ov = 0.15
    tw, th = W / (n - (n - 1) * ov), H / (n - (n - 1) * ov)
    ut = []
    for i in range(n):
        for j in range(n):
            x0, y0 = int(j * tw * (1 - ov)), int(i * th * (1 - ov))
            x1, y1 = min(W, int(x0 + tw)), min(H, int(y0 + th))
            for d in detekt(im.crop((x0, y0, x1, y1))):
                ut.append([d[0] + x0, d[1] + y0, d[2] + x0, d[3] + y0, d[4], d[5]])
    return ut

ut = {'modell': namn, 'variant': a.variant or ('original 2x2' if a.original else 'golden 1080'), 'licens': licens, 'fragor': FRAGOR,
      'lag_troskel': LAG_TROSKEL, 'bredd': a.bredd, 'rutor': a.rutor, 'bilder': {}}
for vag, fid in bilder.items():
    im = Image.open(vag).convert('RGB')
    if a.bredd and im.size[0] != a.bredd:
        im = im.resize((a.bredd, round(im.size[1] * a.bredd / im.size[0])), Image.LANCZOS)
    W, H = im.size
    # första bilden värmer upp (grafer, cache): kör den två gånger och ta den andra tiden
    if not ut['bilder']:
        kor_bild(im)
    t = time.perf_counter()
    det = kor_bild(im)
    ms = round((time.perf_counter() - t) * 1000)
    norm = [[d[0] / W, d[1] / H, d[2] / W, d[3] / H, d[4], d[5]] for d in det]
    ut['bilder'][vag] = {'id': fid, 'W': W, 'H': H, 'ms': ms, 'det': norm}
    print(f'  {fid[:44]:44} {W}×{H} {ms:6} ms  {len(det):4} detektioner', flush=True)
    os.makedirs(os.path.join(HAR, 'resultat'), exist_ok=True)
    fil = os.path.join(HAR, 'resultat', a.modell + (('-' + a.variant) if a.variant else '') + ('-original' if a.original else '') + '.json')
    json.dump(ut, open(fil, 'w'))
print('sparat', fil)
