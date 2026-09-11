// Lägger en bild ovanpå en annan — ett kort (eller en kortbaksida) på ett
// golden-foto — i angiven storlek och vinkel, med en mjuk skugga och lite
// dämpad så att den inte lyser som ett klistermärke. Utan ImageMagick eller
// Python-bibliotek: CoreGraphics finns på varje Mac.
//
//   swift dev/golden/bild/lagg-pa.swift underlag.jpg lapp.jpg ut.jpg x y w [grader] [ljus]
//
//   x, y   lappens övre vänstra hörn i underlaget, som andel av bredd/höjd (0–1)
//   w      lappens bredd som andel av underlagets bredd; höjden följer lappens
//          egna proportioner
//   grader vridning medurs runt lappens mitt (0)
//   ljus   ljusstyrka 0–1 (0,88: lampljus på kvällen, som i fall 01)
//
// Skriver JPEG med kvalitet 1,0 — omkodningen av hela fotot rör titelraderna: med 0,9 lästes Thriving Heath i fall 08 fel, med 0,98 osäkert och ekar lappens ruta i underlaget som
// andelar (x, y, w, h) — det som ska stå i facit om lappen är ett kort.
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

func läs(_ path: String) -> CGImage {
    guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
          let im = CGImageSourceCreateImageAtIndex(src, 0, nil) else {
        FileHandle.standardError.write("kan inte läsa \(path)\n".data(using: .utf8)!); exit(2)
    }
    return im
}

let a = CommandLine.arguments
if a.count < 7 {
    print("Kör: swift dev/golden/bild/lagg-pa.swift underlag.jpg lapp.jpg ut.jpg x y w [grader] [ljus]")
    exit(1)
}
let under = läs(a[1]), lapp = läs(a[2]), ut = a[3]
let fx = Double(a[4])!, fy = Double(a[5])!, fw = Double(a[6])!
let grader = a.count > 7 ? Double(a[7])! : 0
let ljus = a.count > 8 ? Double(a[8])! : 0.88

let W = under.width, H = under.height
let lw = Double(W) * fw
let lh = lw * Double(lapp.height) / Double(lapp.width)
let cx = Double(W) * fx + lw / 2, cy = Double(H) * fy + lh / 2

let cs = CGColorSpaceCreateDeviceRGB()
guard let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0, space: cs,
                          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(3) }
// CoreGraphics har origo nere till vänster: rita underlaget rakt, och räkna
// lappens läge från toppen som bilden gör.
ctx.draw(under, in: CGRect(x: 0, y: 0, width: W, height: H))
ctx.saveGState()
ctx.translateBy(x: cx, y: Double(H) - cy)
ctx.rotate(by: -grader * .pi / 180)
// Skuggan: mjuk, lite nedåt höger som lampan i fall 01 ger.
ctx.setShadow(offset: CGSize(width: 4, height: -6), blur: 14, color: CGColor(gray: 0, alpha: 0.55))
ctx.draw(lapp, in: CGRect(x: -lw / 2, y: -lh / 2, width: lw, height: lh))
ctx.restoreGState()
// Dämpningen: ett halvgenomskinligt svart lager över lappen, vridet som den.
if ljus < 1 {
    ctx.saveGState()
    ctx.translateBy(x: cx, y: Double(H) - cy)
    ctx.rotate(by: -grader * .pi / 180)
    ctx.setFillColor(CGColor(gray: 0, alpha: 1 - ljus))
    ctx.fill(CGRect(x: -lw / 2, y: -lh / 2, width: lw, height: lh))
    ctx.restoreGState()
}
guard let bild = ctx.makeImage(),
      let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: ut) as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else { exit(4) }
CGImageDestinationAddImage(dest, bild, [kCGImageDestinationLossyCompressionQuality: 1.0] as CFDictionary)
CGImageDestinationFinalize(dest)
// Lappens axelparallella ruta efter vridningen, som andelar — det facit vill ha.
let r = abs(grader) * .pi / 180
let bw = lw * cos(r) + lh * sin(r), bh = lw * sin(r) + lh * cos(r)
let f4 = { (v: Double) in String(format: "%.4f", v) }
print("ruta: x \(f4((cx - bw / 2) / Double(W))) y \(f4((cy - bh / 2) / Double(H))) w \(f4(bw / Double(W))) h \(f4(bh / Double(H)))  (lappen \(Int(lw))×\(Int(lh)) px, \(grader)°)")
