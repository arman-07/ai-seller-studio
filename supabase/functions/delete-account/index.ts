import { adminClient, userClient, BUCKET } from "../_shared/supabase.ts";
import { corsHeaders, json } from "../_shared/http.ts";

// Required by App Store Review Guideline 5.1.1(v): apps offering account
// creation must let the user delete their account from inside the app.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const asUser = userClient(req);
  const { data: auth } = await asUser.auth.getUser();
  if (!auth.user) return json({ error: "unauthorized" }, 401);
  const userId = auth.user.id;

  const admin = adminClient();

  // DB rows (profiles, products, product_images, usage_events) cascade on
  // auth.users delete via foreign keys, but Storage objects don't — remove
  // those first. Files live at "<user_id>/<product_id>/<name>".
  try {
    const { data: productDirs, error: listError } = await admin.storage.from(BUCKET).list(userId, { limit: 1000 });
    if (listError) throw listError;
    for (const dir of productDirs ?? []) {
      const dirPath = `${userId}/${dir.name}`;
      const { data: inner } = await admin.storage.from(BUCKET).list(dirPath, { limit: 1000 });
      if (inner?.length) {
        await admin.storage.from(BUCKET).remove(inner.map((f) => `${dirPath}/${f.name}`));
      }
    }
  } catch (err) {
    // Don't block account deletion on storage cleanup failing; log and continue.
    console.error("delete-account: storage cleanup failed", userId, err);
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return json({ error: "delete_failed", details: error.message }, 500);

  return json({ ok: true });
});
