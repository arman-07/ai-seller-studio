import SwiftUI

struct ProductResultView: View {
    let result: ProcessProductResponse
    let studioJPEG: Data?

    var body: some View {
        List {
            if let studioJPEG, let image = UIImage(data: studioJPEG) {
                Section {
                    Image(uiImage: image).resizable().scaledToFit()
                    ShareLink(
                        item: Image(uiImage: image),
                        preview: SharePreview(result.listing.title, image: Image(uiImage: image))
                    )
                }
            }
            copyable("Title", result.listing.title)
            copyable("Description", result.listing.description)
            if !result.listing.tags.isEmpty {
                copyable("Tags", result.listing.tags.joined(separator: ", "))
            }
        }
        .navigationTitle("Listing")
    }

    private func copyable(_ label: String, _ text: String) -> some View {
        Section(label) {
            Text(text).textSelection(.enabled)
            Button("Copy", systemImage: "doc.on.doc") { UIPasteboard.general.string = text }
        }
    }
}
