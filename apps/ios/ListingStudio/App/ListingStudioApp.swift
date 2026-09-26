import SwiftUI

@main
struct ListingStudioApp: App {
    @State private var session = SessionStore()

    /// Local testing only: set the `PREVIEW_SKIP_AUTH` env var (Xcode scheme ▸
    /// Run ▸ Arguments ▸ Environment Variables) or pass `-previewSkipAuth` as a
    /// launch argument to skip Sign in with Apple and see the main flow without
    /// a configured Supabase Auth provider. Compiled out of Release builds.
    private var skipAuthForPreview: Bool {
        #if DEBUG
        let info = ProcessInfo.processInfo
        return info.environment["PREVIEW_SKIP_AUTH"] != nil || info.arguments.contains("-previewSkipAuth")
        #else
        false
        #endif
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if skipAuthForPreview || session.isSignedIn {
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
