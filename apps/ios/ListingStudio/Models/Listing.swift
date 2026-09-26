import Foundation

// Mirrors packages/shared/src (marketplaces.ts, listing.ts, api.ts). Keep in sync.

enum Marketplace: String, Codable, CaseIterable, Identifiable {
    case etsy, ebay, vinted, shopify
    var id: String { rawValue }
    var label: String {
        switch self {
        case .etsy: "Etsy"
        case .ebay: "eBay"
        case .vinted: "Vinted"
        case .shopify: "Shopify"
        }
    }
}

struct Listing: Codable, Equatable {
    var title: String
    var description: String
    var tags: [String]
    var category: String
    var materials: [String]
    var colors: [String]
}

struct ProcessProductRequest: Encodable {
    let productId: UUID
    let studioPath: String
    let aiScene: Bool
}

struct ProcessProductResponse: Decodable {
    let productId: UUID
    let listing: Listing
    let aiScenePath: String?
}

struct NewProduct: Encodable {
    let marketplace: Marketplace
    let seller_note: String?
}

struct ProductRow: Decodable, Identifiable {
    let id: UUID
}
