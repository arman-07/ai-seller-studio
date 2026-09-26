import CoreImage
import CoreImage.CIFilterBuiltins
import UIKit
import Vision

/// On-device "studio photo": cut the subject out with Vision (iOS 17+, free, offline)
/// and place it centered on a white square. No server or API cost.
enum StudioPhotoRenderer {
    enum Failure: Error { case noCGImage, noSubject, renderFailed }

    static let outputSide: CGFloat = 2000
    static let padding: CGFloat = 0.08

    private static let context = CIContext()

    static func render(_ image: UIImage) throws -> Data {
        guard let cgImage = image.cgImage else { throw Failure.noCGImage }

        let request = VNGenerateForegroundInstanceMaskRequest()
        let handler = VNImageRequestHandler(cgImage: cgImage, orientation: image.imageOrientation.cgOrientation)
        try handler.perform([request])
        guard let observation = request.results?.first, !observation.allInstances.isEmpty else {
            throw Failure.noSubject
        }

        let masked = try observation.generateMaskedImage(
            ofInstances: observation.allInstances,
            from: handler,
            croppedToInstancesExtent: true
        )
        let subject = CIImage(cvPixelBuffer: masked)

        // Scale subject to fit inside the padded square, then center it.
        let box = outputSide * (1 - 2 * padding)
        let scale = min(box / subject.extent.width, box / subject.extent.height)
        let scaled = subject.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
        let offset = CGAffineTransform(
            translationX: (outputSide - scaled.extent.width) / 2 - scaled.extent.minX,
            y: (outputSide - scaled.extent.height) / 2 - scaled.extent.minY
        )
        let canvas = CGRect(x: 0, y: 0, width: outputSide, height: outputSide)
        let white = CIImage(color: .white).cropped(to: canvas)
        let composed = scaled.transformed(by: offset).composited(over: white)

        guard let data = context.jpegRepresentation(
            of: composed,
            colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!,
            options: [kCGImageDestinationLossyCompressionQuality as CIImageRepresentationOption: 0.9]
        ) else { throw Failure.renderFailed }
        return data
    }
}

private extension UIImage.Orientation {
    var cgOrientation: CGImagePropertyOrientation {
        switch self {
        case .up: .up
        case .down: .down
        case .left: .left
        case .right: .right
        case .upMirrored: .upMirrored
        case .downMirrored: .downMirrored
        case .leftMirrored: .leftMirrored
        case .rightMirrored: .rightMirrored
        @unknown default: .up
        }
    }
}
