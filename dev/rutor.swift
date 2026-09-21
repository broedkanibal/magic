// Bildrutor ur en skärminspelning, utan ffmpeg (macOS gör det själv).
//
//   swiftc -O -o /tmp/rutor dev/rutor.swift
//   /tmp/rutor <film.mov> <utmapp> <från s> <till s> [steg s]
//
// Skriver per sekund: NNN.jpg (hela skärmen, 1600 px bred) och kam-NNN.jpg
// (kamerabilden i Mesas kamerapanel, i full upplösning — den rutan är
// 0,597–0,909 × 0,443–0,686 av skärmen när panelen är utfälld och
// webbläsaren fyller skärmen, som i inspelningen 2026-09-21). Stämmer inte
// beskärningen: ändra KAM nedan och kör om.
import AVFoundation
import AppKit
let a = CommandLine.arguments
guard a.count >= 5 else { print("rutor <film> <utmapp> <från> <till> [steg]"); exit(2) }
let url = URL(fileURLWithPath: a[1]), ut = a[2]
let fran = Double(a[3])!, till = Double(a[4])!, steg = a.count > 5 ? Double(a[5])! : 1
let KAM = CGRect(x: 0.597, y: 0.443, width: 0.312, height: 0.243)
try? FileManager.default.createDirectory(atPath: ut, withIntermediateDirectories: true)
let asset = AVURLAsset(url: url)
let gen = AVAssetImageGenerator(asset: asset); gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = CMTime(value: 1, timescale: 4)
print("längd \(Int(CMTimeGetSeconds(asset.duration))) s")
func jpg(_ img: CGImage, _ path: String, maxW: Int? = nil) throws {
  var cg = img
  if let w = maxW, img.width > w {
    let h = img.height * w / img.width
    let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
    ctx.interpolationQuality = .high; ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h)); cg = ctx.makeImage()!
  }
  let rep = NSBitmapImageRep(cgImage: cg)
  try rep.representation(using: .jpeg, properties: [.compressionFactor: 0.85])!.write(to: URL(fileURLWithPath: path))
}
var s = fran
while s <= till {
  let img = try gen.copyCGImage(at: CMTime(seconds: s, preferredTimescale: 600), actualTime: nil)
  let n = String(format: "%03d", Int(s))
  try jpg(img, "\(ut)/\(n).jpg", maxW: 1600)
  let W = CGFloat(img.width), H = CGFloat(img.height)
  let r = CGRect(x: KAM.minX * W, y: KAM.minY * H, width: KAM.width * W, height: KAM.height * H)
  if let k = img.cropping(to: r) { try jpg(k, "\(ut)/kam-\(n).jpg") }
  s += steg
}
print("klart: \(ut)")
