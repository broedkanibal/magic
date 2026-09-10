// Beskär en video och kodar om den till H.264 med vald bredd, bitrate och
// bildfrekvens — det som gör en telefoninspelning till ett videofall i golden
// setet. Använder bara det som finns i macOS (AVFoundation): ingen ffmpeg.
//
//   swift dev/golden/video/koda.swift <in> <ut.mp4> <x> <y> <bredd> <höjd> <utbredd> <kbit/s> <fps>
//
// x, y, bredd, höjd är utsnittet i den VISADE bilden — efter telefonens egen
// rotation, alltså som du ser den i QuickTime (0,0 uppe till vänster). Det
// är samma som spårets egna bildpunkter bara när transformen är identitet
// (en skärminspelning); en vanlig porträttvideo har spåret liggande och
// rotationen i preferredTransform, som läggs på först. Utsnittets höjd/bredd
// bestämmer uthöjden. En nyckelruta per sekund, så att sökningen i provet
// blir snabb och exakt.
//
// Exempel (fall 07: bort med statusrad, rubrik, statustext och Safaris rad):
//   swift dev/golden/video/koda.swift original.MP4 video.mp4 0 300 1180 1480 1080 1000 15
import AVFoundation

let a = CommandLine.arguments
guard a.count == 10, let cx = Double(a[3]), let cy = Double(a[4]), let cw = Double(a[5]), let ch = Double(a[6]),
      let utW = Double(a[7]), let kbps = Int(a[8]), let fps = Int32(a[9]), cw > 0, ch > 0, utW > 0 else {
  print("swift koda.swift <in> <ut.mp4> <x> <y> <bredd> <höjd> <utbredd> <kbit/s> <fps>")
  exit(1)
}
let src = AVURLAsset(url: URL(fileURLWithPath: a[1]))
let ut = URL(fileURLWithPath: a[2]); try? FileManager.default.removeItem(at: ut)
guard let track = src.tracks(withMediaType: .video).first else { print("fel: filen har inget videospår"); exit(1) }
let utH = (utW * ch / cw / 2).rounded() * 2          // jämn höjd: H.264 vill ha det
print("källa: \(track.naturalSize), \(track.nominalFrameRate) fps, \(CMTimeGetSeconds(src.duration)) s, transform \(track.preferredTransform)")

// Utsnittet och skalningen görs som en videokomposition: telefonens egen
// preferredTransform först (annars ligger bilden på sidan), sedan flytten till
// utsnittets hörn, sedan skalan.
let comp = AVMutableVideoComposition()
comp.renderSize = CGSize(width: utW, height: utH)
comp.frameDuration = CMTime(value: 1, timescale: fps)
let instr = AVMutableVideoCompositionInstruction()
instr.timeRange = CMTimeRange(start: .zero, duration: src.duration)
let li = AVMutableVideoCompositionLayerInstruction(assetTrack: track)
let s = utW / cw
li.setTransform(track.preferredTransform
  .concatenating(CGAffineTransform(translationX: -cx, y: -cy))
  .concatenating(CGAffineTransform(scaleX: s, y: s)), at: .zero)
instr.layerInstructions = [li]; comp.instructions = [instr]

let reader = try! AVAssetReader(asset: src)
let out = AVAssetReaderVideoCompositionOutput(videoTracks: [track],
  videoSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
out.videoComposition = comp; reader.add(out)
let writer = try! AVAssetWriter(outputURL: ut, fileType: .mp4)
let inp = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: utW, AVVideoHeightKey: utH,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: kbps * 1000,
                                    AVVideoMaxKeyFrameIntervalKey: Int(fps),
                                    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
                                    AVVideoAllowFrameReorderingKey: false]])
inp.expectsMediaDataInRealTime = false; writer.add(inp)
reader.startReading(); writer.startWriting(); writer.startSession(atSourceTime: .zero)
let sem = DispatchSemaphore(value: 0)
inp.requestMediaDataWhenReady(on: DispatchQueue(label: "koda")) {
  while inp.isReadyForMoreMediaData {
    if let sb = out.copyNextSampleBuffer() { inp.append(sb) }
    else { inp.markAsFinished(); writer.finishWriting { sem.signal() }; return }
  }
}
sem.wait()
let storlek = ((try? FileManager.default.attributesOfItem(atPath: ut.path)[.size]) as? Int) ?? 0
if writer.status == .completed {
  print("klar: \(Int(utW))x\(Int(utH)), \(fps) fps, \(kbps) kbit/s → \(storlek / 1024) kB")
} else {
  print("fel: \(String(describing: writer.error)) / läsaren: \(String(describing: reader.error))")
  exit(1)
}
