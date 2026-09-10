// Ett kontaktark: många bildrutor ur en video bredvid varandra, var och en med
// sin tid utsatt. Så läser man av VAD som händer NÄR — tiderna till
// video.handelser i facit.json. Bara macOS egna verktyg, ingen ffmpeg.
//
//   swift dev/golden/video/kontaktark.swift <video> <utmapp> <tider> <bredd per ruta> [kolumner]
//
// <tider> är kommaseparerade sekunder. Arket skrivs som <utmapp>/kontaktark.jpg.
// Exempel (var halvsekund de första tjugo): tider = 0,0.5,1,1.5,…,20
//   swift dev/golden/video/kontaktark.swift video.mp4 /tmp/rutor 0,2,4,6,8,10,12 260
import AVFoundation
import AppKit

let a = CommandLine.arguments
guard a.count >= 5, let bredd = Double(a[4]) else {
  print("swift kontaktark.swift <video> <utmapp> <tider,kommaseparerade> <bredd per ruta> [kolumner]")
  exit(1)
}
let ut = a[2], tider = a[3].split(separator: ",").compactMap { Double($0) }
let kol = a.count > 5 ? (Int(a[5]) ?? 7) : 7
let gen = AVAssetImageGenerator(asset: AVURLAsset(url: URL(fileURLWithPath: a[1])))
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = .zero
var bilder: [(Double, CGImage)] = []
for t in tider {
  do { bilder.append((t, try gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 600), actualTime: nil))) }
  catch { print("fel vid \(t) s: \(error)") }
}
guard let forsta = bilder.first?.1 else { print("fel: ingen ruta gick att läsa"); exit(1) }
print("källa: \(forsta.width)x\(forsta.height), \(bilder.count) rutor")
let h = bredd * Double(forsta.height) / Double(forsta.width)
let rader = (bilder.count + kol - 1) / kol
let ark = NSImage(size: NSSize(width: bredd * Double(kol), height: (h + 18) * Double(rader)))
ark.lockFocus()
NSColor.white.setFill(); NSRect(origin: .zero, size: ark.size).fill()
for (i, (t, img)) in bilder.enumerated() {
  let x = Double(i % kol) * bredd, y = ark.size.height - Double(i / kol + 1) * (h + 18)
  NSGraphicsContext.current!.cgContext.draw(img, in: CGRect(x: x, y: y, width: bredd, height: h))
  (String(format: "%.1f s", t) as NSString).draw(at: NSPoint(x: x + 4, y: y + h + 2),
    withAttributes: [.font: NSFont.boldSystemFont(ofSize: 13), .foregroundColor: NSColor.black])
}
ark.unlockFocus()
/* Utmappen skapas om den saknas — guiden säger åt en att skriva till /tmp/rutor,
   som normalt inte finns, och en krasch med stackdump är fel svar på det. */
try? FileManager.default.createDirectory(atPath: ut, withIntermediateDirectories: true)
guard let tiff = ark.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff),
      let jpg = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.8]) else { print("fel: kunde inte koda arket"); exit(1) }
do { try jpg.write(to: URL(fileURLWithPath: "\(ut)/kontaktark.jpg")) }
catch { print("fel: gick inte att skriva \(ut)/kontaktark.jpg — \(error.localizedDescription)"); exit(1) }
print("\(ut)/kontaktark.jpg")
