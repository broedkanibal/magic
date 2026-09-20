// Läser videons egenskaper: upplösning, bildtakt, längd, rotation, codec.
// Bara macOS egna delar (AVFoundation), ingen ffmpeg — som dev/golden/video/.
//
//   swift dev/las-fore-slapp/probe.swift <video>
import AVFoundation

let a = CommandLine.arguments
guard a.count == 2 else { print("swift probe.swift <video>"); exit(1) }
let asset = AVURLAsset(url: URL(fileURLWithPath: a[1]))
let sem = DispatchSemaphore(value: 0)
Task {
  do {
    let dur = try await asset.load(.duration)
    print("längd: \(CMTimeGetSeconds(dur)) s")
    for t in try await asset.loadTracks(withMediaType: .video) {
      let sz = try await t.load(.naturalSize)
      let tf = try await t.load(.preferredTransform)
      let fps = try await t.load(.nominalFrameRate)
      let br = try await t.load(.estimatedDataRate)
      let mn = try await t.load(.minFrameDuration)
      let visad = CGRect(origin: .zero, size: sz).applying(tf)
      print("spår: naturalSize \(sz), visad \(visad.size), nominalFrameRate \(fps)")
      print("minFrameDuration \(CMTimeGetSeconds(mn)) s = \(1 / CMTimeGetSeconds(mn)) fps")
      print("bitrate: \(br / 1_000_000) Mbit/s, transform \(tf)")
      for d in try await t.load(.formatDescriptions) {
        let c = CMFormatDescriptionGetMediaSubType(d)
        let cs = String(bytes: [UInt8((c >> 24) & 255), UInt8((c >> 16) & 255),
                                UInt8((c >> 8) & 255), UInt8(c & 255)], encoding: .ascii) ?? "?"
        print("codec: \(cs), dims \(CMVideoFormatDescriptionGetDimensions(d))")
      }
    }
    print("ljudspår: \(try await asset.loadTracks(withMediaType: .audio).count)")
  } catch { print("fel: \(error)") }
  sem.signal()
}
sem.wait()
