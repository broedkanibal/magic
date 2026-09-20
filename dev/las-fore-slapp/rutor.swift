// Plockar ut bildrutor ur en video vid exakta tider, i vald bredd, som PNG
// eller JPEG. Bara macOS egna delar (AVFoundation), ingen ffmpeg.
//
//   swift dev/las-fore-slapp/rutor.swift <video> <utmapp> <bredd|0=full> <tider…>
//
// Tiderna är sekunder, kommaseparerade eller en per argument. 0 som bredd ger
// full upplösning. Filnamnet blir t<sekunder med tre decimaler>.png.
//
// Exempel:
//   swift dev/las-fore-slapp/rutor.swift v.mov /tmp/ut 1920 5.0,100.5,300.25
import AVFoundation
import AppKit

let a = CommandLine.arguments
guard a.count >= 5, let bredd = Double(a[3]) else {
  print("swift rutor.swift <video> <utmapp> <bredd|0> <tider…>"); exit(1)
}
let utmapp = URL(fileURLWithPath: a[2])
try? FileManager.default.createDirectory(at: utmapp, withIntermediateDirectories: true)
let tider = a[4...].flatMap { $0.split(separator: ",") }.compactMap { Double($0) }
guard !tider.isEmpty else { print("inga tider"); exit(1) }

let gen = AVAssetImageGenerator(asset: AVURLAsset(url: URL(fileURLWithPath: a[1])))
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero
if bredd > 0 { gen.maximumSize = CGSize(width: bredd, height: bredd * 10) }

for t in tider {
  do {
    let img = try gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 6000), actualTime: nil)
    let rep = NSBitmapImageRep(cgImage: img)
    let namn = String(format: "t%.3f.png", t)
    try rep.representation(using: .png, properties: [:])!
      .write(to: utmapp.appendingPathComponent(namn))
    print("\(namn): \(img.width)x\(img.height)")
  } catch {
    print("fel vid \(t) s: \(error)"); exit(1)
  }
}
