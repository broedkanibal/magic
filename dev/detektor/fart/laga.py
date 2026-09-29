"""MES-288 grind 0: gör D-FINE-filerna körbara i onnxruntime-web 1.22 (WebGPU).

1. MaxPool med ceil_mode=1: WebGPU-vägen i onnxruntime-web 1.22 vägrar
   ("using ceil() in shape computation is not yet supported for MaxPool").
   I D-FINE:s stam (HGNetv2) har den steget 1, och då ger ceil och floor exakt
   samma utstorlek — ceil_mode sätts till 0 bara där steget är 1 överallt.
2. fp16: ORT:s egen omvandlare (onnxruntime.transformers.float16), som
   hanterar Cast-noderna rätt; onnxconverter-common lämnar Cast till float
   kvar och ORT vägrar ladda filen. In- och utdata stannar fp32.

    <venv>/bin/python dev/detektor/fart/laga.py modeller/dfine_nano_coco.onnx [--fp16]

Skriver om filen på plats (och <namn>_fp16.onnx med --fp16). Kör inte onnxsim.
"""
import sys, onnx
from onnx import helper

args = [a for a in sys.argv[1:] if not a.startswith('--')]
for fil in args:
    m = onnx.load(fil)
    andrade = 0
    for n in m.graph.node:
        if n.op_type != 'MaxPool':
            continue
        at = {a.name: a for a in n.attribute}
        if 'ceil_mode' in at and at['ceil_mode'].i == 1:
            steg = list(at['strides'].ints) if 'strides' in at else [1, 1]
            if all(s == 1 for s in steg):
                at['ceil_mode'].i = 0
                andrade += 1
            else:
                print('  lämnar', n.name, 'orörd: steg', steg)
    # 3. MatMul med en vektor som andra faktor (D-FINE:s "integral", softmax ·
    #    projektionsvektorn): WebGPU-vägen i 1.22 fäller den med "shared
    #    dimension does not match". Gör vektorn till en kolumn [K, 1] och ta
    #    bort den sista axeln efteråt — samma tal.
    rank = {}
    try:
        inf = onnx.shape_inference.infer_shapes(m)
        for v in list(inf.graph.value_info) + list(inf.graph.input) + list(inf.graph.output):
            if v.type.tensor_type.HasField('shape'):
                rank[v.name] = len(v.type.tensor_type.shape.dim)
    except Exception as e:
        print('  formslutledningen misslyckades:', e)
    for i in m.graph.initializer:
        rank[i.name] = len(i.dims)
    nya, vektorer = [], 0
    for n in m.graph.node:
        if n.op_type == 'MatMul' and rank.get(n.input[1]) == 1:
            ax = n.name + '_kolumn_axel'
            nya.append(helper.make_node('Constant', [], [ax], value=helper.make_tensor(ax + '_v', onnx.TensorProto.INT64, [1], [-1])))
            kol = n.name + '_B_kolumn'
            nya.append(helper.make_node('Unsqueeze', [n.input[1], ax], [kol], name=n.name + '_kolumn'))
            ut = n.output[0]
            mellan = ut + '_matris'
            n.input[1] = kol
            n.output[0] = mellan
            nya.append(n)
            nya.append(helper.make_node('Squeeze', [mellan, ax], [ut], name=n.name + '_tillbaka'))
            vektorer += 1
        else:
            nya.append(n)
    if vektorer:
        del m.graph.node[:]
        m.graph.node.extend(nya)
    onnx.checker.check_model(m)
    onnx.save(m, fil)
    print(fil, 'MaxPool ceil_mode 1 -> 0:', andrade, '· MatMul med vektor ->kolumn:', vektorer)
    if '--fp16' in sys.argv:
        from onnxruntime.transformers.float16 import convert_float_to_float16
        m16 = convert_float_to_float16(m, keep_io_types=True)
        ut = fil.replace('.onnx', '_fp16.onnx')
        onnx.save(m16, ut)
        print(ut)
