import SwiftUI

@main
struct ListingStudioApp: App {
    @State private var session = SessionStore()

    var body: some Scene {
        WindowGroup {
            Group {
                if session.isSignedIn {
                    CaptureView()
                } else {
                    SignInView()
                }
            }
            .environment(session)
            .task { await session.start() }
        }
    }
}
