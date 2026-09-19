// Kontaktark: flera utsnitt ur videon bredvid varandra i en PNG, med etikett.
// Bara macOS egna delar (AVFoundation + CoreGraphics), ingen ffmpeg.
//
//   swift dev/las-fore-slapp/ark.swift <video> <ut.png> <kolumner> <cellbredd> <rader…>
//
// Varje rad är "tid;x;y;w;h;etikett" där x,y,w,h är 0–1 av bilden (utsnittet
// i den visade bilden). w=0 betyder hela bilden. Raderna kan också ligga i en
// fil: ge "@sökväg" som enda radargument.
import AVFoundation
import AppKit

let a = CommandLine.arguments
guard a.count >= 6, let kol = Int(a[3]), let cellB = Int(a[4]) else {
  print("swift ark.swift <video> <ut.png> <kolumner> <cellbredd> <rader…|@fil>"); exit(1)
}
var rader = Array(a[5...])
if rader.count == 1, rader[0].hasPrefix("@") {
  rader = (try! String(contentsOfFile: String(rader[0].dropFirst()), encoding: .utf8))
    .split(separator: "\n").map(String.init).filter { !$0.isEmpty }
}
struct Post { let t: Double; let r: CGRect; let etikett: String }
let poster: [Post] = rader.compactMap { rad in
  let d = rad.split(separator: ";", omittingEmptySubsequences: false).map(String.init)
  guard d.count >= 6, let t = Double(d[0]), let x = Double(d[1]), let y = Double(d[2]),
        let w = Double(d[3]), let h = Double(d[4]) else { return nil }
  return Post(t: t, r: CGRect(x: x, y: y, width: w, height: h), etikett: d[5])
}
guard !poster.isEmpty else { print("inga rader"); exit(1) }

let gen = AVAssetImageGenerator(asset: AVURLAsset(url: URL(fileURLWithPath: a[1])))
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero

// Första utsnittet bestämmer cellens höjd (alla får samma).
var bilder: [(CGImage, String)] = []
for p in poster {
  do {
    let full = try gen.copyCGImage(at: CMTime(seconds: p.t, preferredTimescale: 6000), actualTime: nil)
    let W = Double(full.width), H = Double(full.height)
    let r = p.r.width <= 0 ? CGRect(x: 0, y: 0, width: W, height: H)
      : CGRect(x: (p.r.minX * W).rounded(), y: (p.r.minY * H).rounded(),
               width: max(8, (p.r.width * W).rounded()), height: max(8, (p.r.height * H).rounded()))
      .intersection(CGRect(x: 0, y: 0, width: W, height: H))
    guard let del = full.cropping(to: r) else { continue }
    bilder.append((del, p.etikett))
  } catch { print("fel vid \(p.t) s: \(error)") }
}
guard let f0 = bilder.first else { print("inga bilder"); exit(1) }
let cellH = Int((Double(cellB) * Double(f0.0.height) / Double(f0.0.width)).rounded())
let rad = (bilder.count + kol - 1) / kol
let etH = 22, marg = 6
let arkB = kol * (cellB + marg) + marg, arkH = rad * (cellH + etH + marg) + marg

let cs = CGColorSpace(name: CGColorSpace.sRGB)!
let ctx = CGContext(data: nil, width: arkB, height: arkH, bitsPerComponent: 8, bytesPerRow: 0,
                    space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.setFillColor(CGColor(red: 0.08, green: 0.08, blue: 0.09, alpha: 1))
ctx.fill(CGRect(x: 0, y: 0, width: arkB, height: arkH))
let ns = NSGraphicsContext(cgContext: ctx, flipped: false)
NSGraphicsContext.current = ns
let attr: [NSAttributedString.Key: Any] = [
  .font: NSFont.monospacedSystemFont(ofSize: 13, weight: .semibold),
  .foregroundColor: NSColor.white]
for (i, b) in bilder.enumerated() {
  let c = i % kol, r = i / kol
  let x = marg + c * (cellB + marg)
  let yTop = marg + r * (cellH + etH + marg)
  let y = arkH - yTop - cellH - etH                     // CoreGraphics räknar nerifrån
  ctx.draw(b.0, in: CGRect(x: x, y: y + etH, width: cellB, height: cellH))
  NSString(string: b.1).draw(at: NSPoint(x: x + 2, y: y + 2), withAttributes: attr)
}
NSGraphicsContext.current = nil
let img = ctx.makeImage()!
try! NSBitmapImageRep(cgImage: img).representation(using: .png, properties: [:])!
  .write(to: URL(fileURLWithPath: a[2]))
print("\(a[2]): \(arkB)x\(arkH), \(bilder.count) bilder")
