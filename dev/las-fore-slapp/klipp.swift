// Klipper ut bildrutor ur videon i ETT svep genom filen — en
// AVAssetImageGenerator per ruta hade sökt om i en 6 GB HEVC-fil tusentals
// gånger. Bara macOS egna delar (AVFoundation), ingen ffmpeg.
//
//   swift dev/las-fore-slapp/klipp.swift <video> <utmapp> <jobb.json> [kvalitet=0.95]
//
// jobb.json: { "poster": [ { "id": "s04-0031", "t": 7.55,
//                            "x": 0.31, "y": 0.52, "w": 0.09, "h": 0.22 } ] }
// x,y,w,h är andelar av den VISADE bilden. Varje post skrivs som
// <utmapp>/<id>.jpg i utsnittets egna bildpunkter (4K), och <utmapp>/ut.json
// bär vad som blev av (verklig tid, utsnittets bildpunkter).
import AVFoundation
import AppKit

let a = CommandLine.arguments
guard a.count >= 4 else { print("swift klipp.swift <video> <utmapp> <jobb.json> [kvalitet]"); exit(1) }
let kvalitet = a.count >= 5 ? (Double(a[4]) ?? 0.95) : 0.95
let utmapp = URL(fileURLWithPath: a[2])
try? FileManager.default.createDirectory(at: utmapp, withIntermediateDirectories: true)

struct Post { let id: String; let t: Double; let r: CGRect }
let rot = try! JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: a[3]))) as! [String: Any]
let poster: [Post] = (rot["poster"] as! [[String: Any]]).map {
  Post(id: $0["id"] as! String, t: ($0["t"] as! NSNumber).doubleValue,
       r: CGRect(x: ($0["x"] as! NSNumber).doubleValue, y: ($0["y"] as! NSNumber).doubleValue,
                 width: ($0["w"] as! NSNumber).doubleValue, height: ($0["h"] as! NSNumber).doubleValue))
}
guard !poster.isEmpty else { print("inga poster"); exit(1) }
// Posterna sorterade i tid: varje avkodad ruta plockar de poster som ligger
// närmast den i tid (inom en halv rutlängd).
let sorterade = poster.sorted { $0.t < $1.t }
let start = sorterade.first!.t, slut = sorterade.last!.t

let src = AVURLAsset(url: URL(fileURLWithPath: a[1]))
guard let track = src.tracks(withMediaType: .video).first else { print("fel: inget videospår"); exit(1) }
let visad = CGRect(origin: .zero, size: track.naturalSize).applying(track.preferredTransform)
let VW = visad.width, VH = visad.height

let comp = AVMutableVideoComposition()
comp.renderSize = CGSize(width: VW, height: VH)
comp.frameDuration = CMTime(value: 1, timescale: 600)
let instr = AVMutableVideoCompositionInstruction()
instr.timeRange = CMTimeRange(start: .zero, duration: src.duration)
let li = AVMutableVideoCompositionLayerInstruction(assetTrack: track)
li.setTransform(track.preferredTransform
  .concatenating(CGAffineTransform(translationX: -visad.minX, y: -visad.minY)), at: .zero)
instr.layerInstructions = [li]
comp.instructions = [instr]

let reader = try! AVAssetReader(asset: src)
reader.timeRange = CMTimeRange(start: CMTime(seconds: max(0, start - 0.05), preferredTimescale: 600),
                               end: CMTime(seconds: slut + 0.05, preferredTimescale: 600))
let out = AVAssetReaderVideoCompositionOutput(videoTracks: [track],
  videoSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
out.videoComposition = comp
out.alwaysCopiesSampleData = false
reader.add(out)
reader.startReading()

let cs = CGColorSpace(name: CGColorSpace.sRGB)!
var nasta = 0, nr = 0, skrivna = 0
var ut: [[String: Any]] = []
let t0 = Date()
let RUTA = 1.0 / 59.94

while let sb = out.copyNextSampleBuffer() {
  let tid = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sb))
  // Vilka poster hör till den här rutan?
  var mina: [Post] = []
  while nasta < sorterade.count && sorterade[nasta].t < tid + RUTA / 2 {
    if sorterade[nasta].t >= tid - RUTA / 2 { mina.append(sorterade[nasta]) }
    nasta += 1
  }
  if !mina.isEmpty, let pb = CMSampleBufferGetImageBuffer(sb) {
    CVPixelBufferLockBaseAddress(pb, .readOnly)
    let ctx = CGContext(data: CVPixelBufferGetBaseAddress(pb)!,
                        width: CVPixelBufferGetWidth(pb), height: CVPixelBufferGetHeight(pb),
                        bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pb), space: cs,
                        bitmapInfo: CGBitmapInfo.byteOrder32Little.rawValue | CGImageAlphaInfo.noneSkipFirst.rawValue)
    if let hel = ctx?.makeImage() {
      for p in mina {
        let r = CGRect(x: (p.r.minX * VW).rounded(), y: (p.r.minY * VH).rounded(),
                       width: max(8, (p.r.width * VW).rounded()), height: max(8, (p.r.height * VH).rounded()))
          .intersection(CGRect(x: 0, y: 0, width: VW, height: VH))
        guard let del = hel.cropping(to: r) else { continue }
        let rep = NSBitmapImageRep(cgImage: del)
        try? rep.representation(using: .jpeg, properties: [.compressionFactor: kvalitet])!
          .write(to: utmapp.appendingPathComponent(p.id + ".jpg"))
        ut.append(["id": p.id, "fil": p.id + ".jpg", "t": tid, "x": r.minX, "y": r.minY, "w": r.width, "h": r.height])
        skrivna += 1
      }
    }
    CVPixelBufferUnlockBaseAddress(pb, .readOnly)
  }
  CMSampleBufferInvalidate(sb)
  nr += 1
  if nr % 3000 == 0 { print("  \(nr) rutor lästa, \(skrivna)/\(poster.count) skrivna, \(String(format: "%.1f", tid)) s"); fflush(stdout) }
  if nasta >= sorterade.count { break }
}
if reader.status == .failed { print("läsfel: \(String(describing: reader.error))") }
try! JSONSerialization.data(withJSONObject: ["bildW": VW, "bildH": VH, "rutor": ut], options: [.prettyPrinted])
  .write(to: utmapp.appendingPathComponent("ut.json"))
print("klar: \(skrivna) av \(poster.count) rutor på \(String(format: "%.0f", Date().timeIntervalSince(t0))) s → \(utmapp.path)")
