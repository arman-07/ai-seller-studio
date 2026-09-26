/**
 * AI studio scene behind a small interface so the provider can be swapped
 * (Photoroom now, fal.ai later if volume makes it cheaper).
 */
export interface SceneProvider {
  createScene(image: Uint8Array<ArrayBuffer>, mediaType: string): Promise<Uint8Array>;
}

/**
 * Photoroom Image Editing API v2. Parameter names follow their docs as of 2025;
 * verify at https://docs.photoroom.com before going live.
 */
export class PhotoroomProvider implements SceneProvider {
  constructor(private apiKey: string) {}

  async createScene(image: Uint8Array<ArrayBuffer>, mediaType: string): Promise<Uint8Array> {
    const form = new FormData();
    form.append("imageFile", new Blob([image], { type: mediaType }), "product");
    form.append("background.prompt", "product photo on a soft neutral studio surface, gentle natural light");
    form.append("shadow.mode", "ai.soft");
    form.append("padding", "0.1");
    form.append("outputSize", "2000x2000");

    const res = await fetch("https://image-api.photoroom.com/v2/edit", {
      method: "POST",
      headers: { "x-api-key": this.apiKey },
      body: form,
    });
    if (!res.ok) throw new Error(`photoroom ${res.status}: ${await res.text()}`);
    return new Uint8Array(await res.arrayBuffer());
  }
}

export function sceneProvider(): SceneProvider | null {
  const key = Deno.env.get("PHOTOROOM_API_KEY");
  return key ? new PhotoroomProvider(key) : null;
}
