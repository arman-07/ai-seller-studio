import PhotosUI
import SwiftUI

struct CaptureView: View {
    @State private var pickerItem: PhotosPickerItem?
    @State private var showCamera = false
    @State private var marketplace: Marketplace = .etsy
    @State private var sellerNote = ""
    @State private var studioJPEG: Data?
    @State private var isWorking = false
    @State private var result: ProcessProductResponse?
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Photo") {
                    if let studioJPEG, let image = UIImage(data: studioJPEG) {
                        Image(uiImage: image).resizable().scaledToFit().frame(maxHeight: 280)
                    }
                    Button("Take photo", systemImage: "camera") { showCamera = true }
                        .disabled(!UIImagePickerController.isSourceTypeAvailable(.camera))
                    PhotosPicker("Choose from library", selection: $pickerItem, matching: .images)
                }
                Section("Listing") {
                    Picker("Marketplace", selection: $marketplace) {
                        ForEach(Marketplace.allCases) { Text($0.label).tag($0) }
                    }
                    TextField("Note: brand, size, condition (optional)", text: $sellerNote, axis: .vertical)
                }
                Section {
                    Button(isWorking ? "Working…" : "Create listing") { Task { await createListing() } }
                        .disabled(studioJPEG == nil || isWorking)
                }
                if let error { Text(error).foregroundStyle(.red) }
            }
            .navigationTitle("New product")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    NavigationLink("History") { HistoryView() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink("Settings") { SettingsView() }
                }
            }
            .sheet(isPresented: $showCamera) {
                CameraPicker { image in cutOut(image) }.ignoresSafeArea()
            }
            .onChange(of: pickerItem) { _, item in
                Task {
                    guard let data = try? await item?.loadTransferable(type: Data.self),
                          let image = UIImage(data: data) else { return }
                    cutOut(image)
                }
            }
            .navigationDestination(item: $result) { ProductResultView(result: $0, studioJPEG: studioJPEG) }
        }
    }

    private func cutOut(_ image: UIImage) {
        error = nil
        do {
            studioJPEG = try StudioPhotoRenderer.render(image)
        } catch {
            self.error = "Couldn't find the product in this photo. Try a plainer background."
        }
    }

    private func createListing() async {
        guard let studioJPEG else { return }
        isWorking = true
        defer { isWorking = false }
        do {
            let note = sellerNote.trimmingCharacters(in: .whitespacesAndNewlines)
            result = try await ProductService.process(
                studioJPEG: studioJPEG,
                marketplace: marketplace,
                sellerNote: note.isEmpty ? nil : note,
                aiScene: false
            )
        } catch {
            self.error = error.localizedDescription
        }
    }
}

extension ProcessProductResponse: Hashable, Identifiable {
    var id: UUID { productId }
    static func == (a: Self, b: Self) -> Bool { a.productId == b.productId }
    func hash(into hasher: inout Hasher) { hasher.combine(productId) }
}
