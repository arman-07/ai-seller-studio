import AuthenticationServices
import CryptoKit
import SwiftUI

struct SignInView: View {
    @Environment(SessionStore.self) private var session
    @State private var nonce = ""
    @State private var error: String?

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            Text("Listing Studio").font(.largeTitle.bold())
            Text("Snap a product. Get a studio photo, title, description and tags.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
            Spacer()
            SignInWithAppleButton(.signIn) { request in
                nonce = Self.randomNonce()
                request.requestedScopes = [.email]
                request.nonce = Self.sha256(nonce)
            } onCompletion: { result in
                Task { await handle(result) }
            }
            .frame(height: 50)
            if let error { Text(error).font(.footnote).foregroundStyle(.red) }
        }
        .padding()
    }

    private func handle(_ result: Result<ASAuthorization, Error>) async {
        do {
            guard
                case let .success(auth) = result,
                let credential = auth.credential as? ASAuthorizationAppleIDCredential,
                let tokenData = credential.identityToken,
                let idToken = String(data: tokenData, encoding: .utf8)
            else { return }
            try await session.signInWithApple(idToken: idToken, nonce: nonce)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private static func randomNonce() -> String {
        (0..<32).map { _ in String(format: "%02x", UInt8.random(in: 0...255)) }.joined()
    }

    private static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}
