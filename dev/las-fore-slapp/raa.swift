// JPEG/PNG → rå RGB (och tillbaka), så att utskärningen går att skruva i
// Node utan en webbläsare. Bara macOS egna delar.
//
//   swift dev/las-fore-slapp/raa.swift las <bild> <ut.raw>     # ut.raw: "W H\n" + RGB
//   swift dev/las-fore-slapp/raa.swift skriv <in.raw> <ut.png>
import AppKit

let a = CommandLine.arguments
guard a.count == 4 else { print("swift raa.swift las|skriv <in> <ut>"); exit(1) }

if a[1] == "las" {
  guard let img = NSImage(contentsOfFile: a[2]),
        let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { print("kan inte läsa \(a[2])"); exit(1) }
  let W = cg.width, H = cg.height
  var pix = [UInt8](repeating: 0, count: W * H * 4)
  let cs = CGColorSpace(name: CGColorSpace.sRGB)!
  pix.withUnsafeMutableBytes { bp in
    let ctx = CGContext(data: bp.baseAddress, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W * 4,
                        space: cs, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
    ctx.draw(cg, in: CGRect(x: 0, y: 0, width: W, height: H))
  }
  var ut = Data("\(W) \(H)\n".utf8)
  ut.reserveCapacity(W * H * 3 + 16)
  for i in 0..<(W * H) { ut.append(pix[i * 4]); ut.append(pix[i * 4 + 1]); ut.append(pix[i * 4 + 2]) }
  try! ut.write(to: URL(fileURLWithPath: a[3]))
  print("\(W) \(H)")
} else {
  let d = try! Data(contentsOf: URL(fileURLWithPath: a[2]))
  guard let nl = d.firstIndex(of: 0x0A) else { print("saknar huvud"); exit(1) }
  let delar = String(data: d[..<nl], encoding: .utf8)!.split(separator: " ")
  let W = Int(delar[0])!, H = Int(delar[1])!
  let kropp = [UInt8](d[(nl + 1)...])
  var pix = [UInt8](repeating: 255, count: W * H * 4)
  for i in 0..<(W * H) { pix[i * 4] = kropp[i * 3]; pix[i * 4 + 1] = kropp[i * 3 + 1]; pix[i * 4 + 2] = kropp[i * 3 + 2] }
  let cs = CGColorSpace(name: CGColorSpace.sRGB)!
  let cg: CGImage = pix.withUnsafeMutableBytes { bp in
    CGContext(data: bp.baseAddress, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W * 4,
              space: cs, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!.makeImage()!
  }
  try! NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:])!
    .write(to: URL(fileURLWithPath: a[3]))
  print("\(a[3]): \(W)x\(H)")
}
