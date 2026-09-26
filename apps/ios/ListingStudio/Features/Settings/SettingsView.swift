import SwiftUI

struct SettingsView: View {
    @Environment(SessionStore.self) private var session
    @State private var isDeleting = false
    @State private var showDeleteConfirm = false
    @State private var error: String?

    var body: some View {
        Form {
            Section {
                Button("Sign out") { Task { await session.signOut() } }
            }
            Section {
                Button("Delete account", role: .destructive) { showDeleteConfirm = true }
                    .disabled(isDeleting)
            } footer: {
                Text("Permanently deletes your account, products and photos. This can't be undone.")
            }
            if let error { Text(error).foregroundStyle(.red) }
        }
        .navigationTitle("Settings")
        .confirmationDialog(
            "Delete your account?",
            isPresented: $showDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("Delete account", role: .destructive) { Task { await deleteAccount() } }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This permanently deletes your account, products and photos.")
        }
        .disabled(isDeleting)
        .overlay { if isDeleting { ProgressView() } }
    }

    private func deleteAccount() async {
        isDeleting = true
        defer { isDeleting = false }
        do {
            try await AccountService.deleteAccount()
            await session.signOut()
        } catch {
            self.error = error.localizedDescription
        }
    }
}
