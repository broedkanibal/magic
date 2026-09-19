// Går igenom hela videon en gång och skriver två saker:
//
//   grå.bin    varje ruta nedskalad till <bredd>×<höjd>, en byte per bildpunkt
//              (gråskala). Läses sedan av Node utan att videon rörs igen.
//   metrik.csv en rad per ruta: nr, tid, medelskillnad mot förra rutan,
//              antal bildpunkter som ändrats mer än 10 steg.
//
// Det är underlaget för att hitta stegen: en handling är en topp i
// skillnaden, och pausen mellan stegen är en dal.
//
//   swift dev/las-fore-slapp/rorelse.swift <video> <utmapp> [bredd=320]
//
// Bara macOS egna delar (AVFoundation), ingen ffmpeg — som dev/golden/video/.
import AVFoundation
import CoreGraphics

let a = CommandLine.arguments
guard a.count >= 3 else { print("swift rorelse.swift <video> <utmapp> [bredd]"); exit(1) }
let bredd = a.count >= 4 ? (Int(a[3]) ?? 320) : 320
let utmapp = URL(fileURLWithPath: a[2])
try? FileManager.default.createDirectory(at: utmapp, withIntermediateDirectories: true)

let src = AVURLAsset(url: URL(fileURLWithPath: a[1]))
guard let track = src.tracks(withMediaType: .video).first else { print("fel: inget videospår"); exit(1) }
let natur = track.naturalSize
let visad = CGRect(origin: .zero, size: natur).applying(track.preferredTransform)
let hojd = Int((Double(bredd) * visad.height / visad.width / 2).rounded() * 2)
print("skalar \(Int(visad.width))x\(Int(visad.height)) → \(bredd)x\(hojd)")

let comp = AVMutableVideoComposition()
comp.renderSize = CGSize(width: bredd, height: hojd)
comp.frameDuration = CMTime(value: 1, timescale: 600)   // varje ruta som den är
let instr = AVMutableVideoCompositionInstruction()
instr.timeRange = CMTimeRange(start: .zero, duration: src.duration)
let li = AVMutableVideoCompositionLayerInstruction(assetTrack: track)
let s = Double(bredd) / visad.width
li.setTransform(track.preferredTransform
  .concatenating(CGAffineTransform(translationX: -visad.minX, y: -visad.minY))
  .concatenating(CGAffineTransform(scaleX: s, y: s)), at: .zero)
instr.layerInstructions = [li]
comp.instructions = [instr]

let reader = try! AVAssetReader(asset: src)
let out = AVAssetReaderVideoCompositionOutput(videoTracks: [track],
  videoSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
out.videoComposition = comp
out.alwaysCopiesSampleData = false
reader.add(out)
reader.startReading()

let n = bredd * hojd
var gra = [UInt8](repeating: 0, count: n)
var forra = [UInt8](repeating: 0, count: n)
var harForra = false
var csv = "nr,tid,diff,andrade\n"
csv.reserveCapacity(1 << 22)
let binUrl = utmapp.appendingPathComponent("gra.bin")
FileManager.default.createFile(atPath: binUrl.path, contents: nil)
let bin = try! FileHandle(forWritingTo: binUrl)
var nr = 0
let t0 = Date()

while let sb = out.copyNextSampleBuffer() {
  guard let pb = CMSampleBufferGetImageBuffer(sb) else { continue }
  let tid = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sb))
  CVPixelBufferLockBaseAddress(pb, .readOnly)
  let bpr = CVPixelBufferGetBytesPerRow(pb)
  let bas = CVPixelBufferGetBaseAddress(pb)!.assumingMemoryBound(to: UInt8.self)
  for y in 0..<hojd {
    let rad = bas + y * bpr
    for x in 0..<bredd {
      let p = rad + x * 4                                    // BGRA
      // Rec.601-grå, heltal: (B*29 + G*150 + R*77) >> 8
      let v = (Int(p[0]) * 29 + Int(p[1]) * 150 + Int(p[2]) * 77) >> 8
      gra[y * bredd + x] = UInt8(v > 255 ? 255 : v)
    }
  }
  CVPixelBufferUnlockBaseAddress(pb, .readOnly)
  CMSampleBufferInvalidate(sb)

  var summa = 0, andrade = 0
  if harForra {
    for i in 0..<n {
      let d = Int(gra[i]) - Int(forra[i])
      let ad = d < 0 ? -d : d
      summa += ad
      if ad > 10 { andrade += 1 }
    }
  }
  csv += "\(nr),\(String(format: "%.5f", tid)),\(String(format: "%.4f", Double(summa) / Double(n))),\(andrade)\n"
  bin.write(Data(gra))
  forra = gra
  harForra = true
  nr += 1
  if nr % 2000 == 0 {
    let g = Date().timeIntervalSince(t0)
    print("  \(nr) rutor, \(String(format: "%.1f", tid)) s video, \(String(format: "%.0f", Double(nr) / g)) rutor/s")
    fflush(stdout)
  }
}
try! bin.close()
try! csv.write(to: utmapp.appendingPathComponent("metrik.csv"), atomically: true, encoding: .utf8)
if reader.status == .failed { print("läsfel: \(String(describing: reader.error))"); exit(1) }
print("klar: \(nr) rutor på \(String(format: "%.0f", Date().timeIntervalSince(t0))) s → \(utmapp.path)")
print("gra.bin: \(bredd)x\(hojd) per ruta, \(n) byte, \(nr) rutor")
