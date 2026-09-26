import Foundation
import Observation
import Supabase

@Observable
@MainActor
final class SessionStore {
    private(set) var isSignedIn = false

    func start() async {
        for await (_, session) in supabase.auth.authStateChanges {
            isSignedIn = session != nil && !(session?.isExpired ?? true)
        }
    }

    func signInWithApple(idToken: String, nonce: String) async throws {
        try await supabase.auth.signInWithIdToken(
            credentials: OpenIDConnectCredentials(provider: .apple, idToken: idToken, nonce: nonce)
        )
    }

    func signOut() async {
        try? await supabase.auth.signOut()
    }
}
