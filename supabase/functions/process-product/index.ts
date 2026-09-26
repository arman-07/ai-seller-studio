import { ProcessProductRequest, USAGE_LIMIT_ERROR, type ProcessProductResponse } from "../../../packages/shared/src/index.ts";
import { adminClient, userClient, BUCKET } from "../_shared/supabase.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { generateListing } from "../_shared/listing.ts";
import { sceneProvider } from "../_shared/ai-scene.ts";
import { remaining } from "../_shared/limits.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const asUser = userClient(req);
  const { data: auth } = await asUser.auth.getUser();
  if (!auth.user) return json({ error: "unauthorized" }, 401);
  const userId = auth.user.id;

  const parsed = ProcessProductRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "bad_request", details: parsed.error.issues }, 400);
  const { productId, studioPath, aiScene } = parsed.data;
  if (!studioPath.startsWith(`${userId}/`)) return json({ error: "forbidden_path" }, 403);

  // RLS: returns nothing unless the product belongs to the caller.
  const { data: product } = await asUser.from("products").select("id, marketplace, seller_note").eq("id", productId).single();
  if (!product) return json({ error: "not_found" }, 404);

  const admin = adminClient();
  if ((await remaining(admin, userId, "product")) <= 0) return json({ error: USAGE_LIMIT_ERROR, kind: "product" }, 402);
  const scenes = aiScene ? sceneProvider() : null;
  if (aiScene && !scenes) return json({ error: "ai_scene_unavailable" }, 503);
  if (aiScene && (await remaining(admin, userId, "ai_scene")) <= 0) {
    return json({ error: USAGE_LIMIT_ERROR, kind: "ai_scene" }, 402);
  }

  await admin.from("products").update({ status: "processing", error: null }).eq("id", productId);

  try {
    const { data: file, error: dlError } = await admin.storage.from(BUCKET).download(studioPath);
    if (dlError || !file) throw dlError ?? new Error("studio image missing");
    const mediaType = (["image/png", "image/jpeg", "image/webp"] as const).find((t) => t === file.type) ?? "image/png";
    const image = new Uint8Array(await file.arrayBuffer());

    const [listing, sceneBytes] = await Promise.all([
      generateListing(image, mediaType, product.marketplace, product.seller_note),
      scenes ? scenes.createScene(image, mediaType) : Promise.resolve(null),
    ]);

    let aiScenePath: string | null = null;
    if (sceneBytes) {
      aiScenePath = `${userId}/${productId}/scene-${crypto.randomUUID()}.png`;
      const { error: upError } = await admin.storage.from(BUCKET).upload(aiScenePath, sceneBytes, { contentType: "image/png" });
      if (upError) throw upError;
    }

    await admin.from("product_images").upsert(
      { product_id: productId, user_id: userId, position: 0, studio_path: studioPath, ai_scene_path: aiScenePath },
      { onConflict: "product_id,position" },
    );
    await admin.from("products").update({ status: "ready", ...listing }).eq("id", productId);
    await admin.from("usage_events").insert([
      { user_id: userId, kind: "product", product_id: productId },
      ...(aiScenePath ? [{ user_id: userId, kind: "ai_scene", product_id: productId }] : []),
    ]);

    const body: ProcessProductResponse = { productId, listing, aiScenePath };
    return json(body);
  } catch (err) {
    console.error("process-product failed", productId, err);
    await admin.from("products").update({ status: "failed", error: String(err) }).eq("id", productId);
    return json({ error: "processing_failed" }, 500);
  }
});
