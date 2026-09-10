// En bildruta i full storlek ur en video, som JPEG — så blir fallets bild.jpg
// till (sista rutan visar slutläget). Bara macOS egna verktyg, ingen ffmpeg.
//
//   swift dev/golden/video/ruta.swift <video> <tid i sekunder> <ut.jpg>
//
// Exempel: swift dev/golden/video/ruta.swift video.mp4 36.5 bild.jpg
import AVFoundation
import AppKit

let a = CommandLine.arguments
guard a.count == 4, let tid = Double(a[2]) else {
  print("swift ruta.swift <video> <tid i sekunder> <ut.jpg>")
  exit(1)
}
let gen = AVAssetImageGenerator(asset: AVURLAsset(url: URL(fileURLWithPath: a[1])))
gen.appliesPreferredTrackTransform = true
// Ingen tolerans: rutan blir den vid EXAKT den tiden, inte närmaste nyckelruta.
gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = .zero
do {
  let img = try gen.copyCGImage(at: CMTime(seconds: tid, preferredTimescale: 600), actualTime: nil)
  let rep = NSBitmapImageRep(cgImage: img)
  try rep.representation(using: .jpeg, properties: [.compressionFactor: 0.8])!.write(to: URL(fileURLWithPath: a[3]))
  print("\(a[3]): \(img.width)x\(img.height)")
} catch {
  print("fel vid \(tid) s: \(error)")
  exit(1)
}
