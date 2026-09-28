// En bildruta i full upplösning ur en video, vid given sekund (macOS, AVFoundation).
// OpenCV:s sökning fungerar inte på skärminspelningarna, och dev/rutor.swift
// skalar ner helbilden till 1600 px.
//
//   swiftc -O -o $TMPDIR/mesa-ruta dev/detektor/larare/ruta.swift
//   $TMPDIR/mesa-ruta <video> <ut.png> <sekund> [<ut2.png> <sekund2> …]
import AVFoundation
import AppKit
let a = CommandLine.arguments
guard a.count >= 4, (a.count - 2) % 2 == 0 else { print("ruta <video> <ut.png> <sekund> [<ut> <sekund> …]"); exit(2) }
let asset = AVURLAsset(url: URL(fileURLWithPath: a[1]))
let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = CMTime(value: 1, timescale: 30)
var i = 2
while i + 1 < a.count {
  let ut = a[i], s = Double(a[i + 1])!
  let img = try gen.copyCGImage(at: CMTime(seconds: s, preferredTimescale: 600), actualTime: nil)
  let rep = NSBitmapImageRep(cgImage: img)
  try rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: ut))
  print("\(ut) \(img.width)×\(img.height)")
  i += 2
}
