import SwiftUI

struct HistoryItem: Decodable, Identifiable {
    struct Image: Decodable {
        let studio_path: String
        let ai_scene_path: String?
    }

    let id: UUID
    let title: String?
    let marketplace: Marketplace
    let status: String
    let tags: [String]
    let created_at: String
    let product_images: [Image]

    var thumbnailPath: String? { (product_images.first?.ai_scene_path) ?? product_images.first?.studio_path }
}

struct HistoryView: View {
    @State private var items: [HistoryItem] = []
    @State private var thumbnails: [UUID: UIImage] = [:]
    @State private var isLoading = true
    @State private var error: String?

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
            } else if let error {
                ContentUnavailableView("Couldn't load history", systemImage: "exclamationmark.triangle", description: Text(error))
            } else if items.isEmpty {
                ContentUnavailableView("No products yet", systemImage: "photo.stack", description: Text("Products you create show up here."))
            } else {
                List(items) { item in
                    HStack(spacing: 12) {
                        Group {
                            if let image = thumbnails[item.id] {
                                Image(uiImage: image).resizable().scaledToFill()
                            } else {
                                Color(.secondarySystemBackground)
                            }
                        }
                        .frame(width: 56, height: 56)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .task { await loadThumbnail(for: item) }

                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.title?.isEmpty == false ? item.title! : "Untitled")
                                .font(.body)
                            Text("\(item.marketplace.label) · \(item.status)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .navigationTitle("History")
        .task { await load() }
    }

    private func load() async {
        do {
            items = try await ProductService.history()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    private func loadThumbnail(for item: HistoryItem) async {
        guard thumbnails[item.id] == nil, let path = item.thumbnailPath else { return }
        if let data = try? await ProductService.download(path), let image = UIImage(data: data) {
            thumbnails[item.id] = image
        }
    }
}
