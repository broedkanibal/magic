#!/usr/bin/env python3
"""Hämtar de färdiga modellerna för nollprovet (MES-288 steg 0) och laddar
dem en gång, som rökprov. Vikterna hamnar i Hugging Faces cache
(~/.cache/huggingface) och i VIKTER-mappen — aldrig i repot.

Källor, alla officiella:
  OWLv2            google/owlv2-base-patch16-ensemble          (Apache-2.0)
  Grounding DINO   IDEA-Research/grounding-dino-tiny           (Apache-2.0)
  YOLO-World       ultralytics yolov8s-worldv2.pt              (AGPL-3.0; CLIP-textkodaren MIT)
  MobileSAM        github.com/ChaoningZhang/MobileSAM          (Apache-2.0), vikter ur samma repo

Kör:  VIKTER=<mapp> python dev/detektor/hamta.py [owlv2 gdino yolo mobilesam]
"""
import os, sys, time, subprocess, urllib.request, zipfile

VIKTER = os.environ.get('VIKTER') or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vikter')
os.makedirs(VIKTER, exist_ok=True)
vilka = sys.argv[1:] or ['owlv2', 'gdino', 'yolo', 'mobilesam']

def klocka(namn, f):
    t = time.perf_counter()
    r = f()
    print(f'{namn}: {time.perf_counter() - t:.1f} s', flush=True)
    return r

if 'owlv2' in vilka:
    from transformers import Owlv2Processor, Owlv2ForObjectDetection
    klocka('owlv2 laddad', lambda: (Owlv2Processor.from_pretrained('google/owlv2-base-patch16-ensemble'),
                                     Owlv2ForObjectDetection.from_pretrained('google/owlv2-base-patch16-ensemble')))

if 'gdino' in vilka:
    from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection
    klocka('grounding-dino-tiny laddad', lambda: (AutoProcessor.from_pretrained('IDEA-Research/grounding-dino-tiny'),
                                                   AutoModelForZeroShotObjectDetection.from_pretrained('IDEA-Research/grounding-dino-tiny')))

if 'yolo' in vilka:
    os.chdir(VIKTER)   # ultralytics laddar ner .pt till arbetsmappen
    from ultralytics import YOLO
    m = klocka('yolov8s-worldv2 laddad', lambda: YOLO('yolov8s-worldv2.pt'))
    klocka('yolo-world textkodare (CLIP)', lambda: m.set_classes(['playing card']))

if 'mobilesam' in vilka:
    zipp = os.path.join(VIKTER, 'MobileSAM-master.zip')
    if not os.path.exists(zipp):
        klocka('MobileSAM repo-zip', lambda: urllib.request.urlretrieve('https://github.com/ChaoningZhang/MobileSAM/archive/refs/heads/master.zip', zipp))
    mapp = os.path.join(VIKTER, 'MobileSAM-master')
    if not os.path.isdir(mapp):
        with zipfile.ZipFile(zipp) as z: z.extractall(VIKTER)
    r = subprocess.run([sys.executable, '-m', 'pip', 'install', '--no-deps', mapp], capture_output=True, text=True)
    print('pip install mobile_sam:', r.returncode, (r.stdout + r.stderr).strip().splitlines()[-1] if (r.stdout + r.stderr).strip() else '')
    vikt = os.path.join(mapp, 'weights', 'mobile_sam.pt')
    print('mobile_sam.pt:', os.path.getsize(vikt) // 1024, 'kB' if os.path.exists(vikt) else 'SAKNAS')
    from mobile_sam import sam_model_registry
    klocka('mobile_sam laddad', lambda: sam_model_registry['vit_t'](checkpoint=vikt))
print('KLAR')
