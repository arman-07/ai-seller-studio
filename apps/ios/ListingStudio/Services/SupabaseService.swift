import Foundation
import Supabase

enum AppConfig {
    static func value(_ key: String) -> String {
        guard let v = Bundle.main.object(forInfoDictionaryKey: key) as? String, !v.isEmpty else {
            fatalError("Missing \(key): copy Config/Secrets.example.xcconfig to Config/Secrets.xcconfig")
        }
        return v
    }
}

let supabase = SupabaseClient(
    supabaseURL: URL(string: AppConfig.value("SUPABASE_URL"))!,
    supabaseKey: AppConfig.value("SUPABASE_ANON_KEY")
)

enum ProductService {
    static let bucket = "product-images"

    /// Creates the product row, uploads the studio photo, asks the backend for the listing.
    static func process(
        studioJPEG: Data,
        marketplace: Marketplace,
        sellerNote: String?,
        aiScene: Bool
    ) async throws -> ProcessProductResponse {
        let userId = try await supabase.auth.session.user.id

        let product: ProductRow = try await supabase
            .from("products")
            .insert(NewProduct(marketplace: marketplace, seller_note: sellerNote))
            .select("id")
            .single()
            .execute()
            .value

        // Storage RLS requires the first folder to be the user id.
        let path = "\(userId.uuidString.lowercased())/\(product.id.uuidString.lowercased())/studio.jpg"
        try await supabase.storage.from(bucket).upload(
            path,
            data: studioJPEG,
            options: FileOptions(contentType: "image/jpeg", upsert: true)
        )

        return try await supabase.functions.invoke(
            "process-product",
            options: FunctionInvokeOptions(
                body: ProcessProductRequest(productId: product.id, studioPath: path, aiScene: aiScene)
            )
        )
    }

    static func download(_ path: String) async throws -> Data {
        try await supabase.storage.from(bucket).download(path: path)
    }

    static func history() async throws -> [HistoryItem] {
        try await supabase
            .from("products")
            .select("id, title, marketplace, status, tags, created_at, product_images(studio_path, ai_scene_path)")
            .order("created_at", ascending: false)
            .execute()
            .value
    }
}

enum AccountService {
    /// Calls the `delete-account` edge function, which removes storage files and
    /// deletes the auth user (DB rows cascade via foreign keys). Required for App Store review.
    static func deleteAccount() async throws {
        try await supabase.functions.invoke("delete-account")
    }
}
