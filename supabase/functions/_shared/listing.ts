import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { encodeBase64 } from "@std/encoding/base64";
import { ListingSchema, clampListing, type Listing, type Marketplace } from "../../../packages/shared/src/index.ts";
import { LISTING_SYSTEM_PROMPT, buildListingUserPrompt } from "../../../packages/prompts/src/index.ts";

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

type ImageMediaType = "image/png" | "image/jpeg" | "image/webp";

export async function generateListing(
  image: Uint8Array,
  mediaType: ImageMediaType,
  marketplace: Marketplace,
  sellerNote?: string | null,
): Promise<Listing> {
  const response = await client.messages.parse({
    model: Deno.env.get("CLAUDE_MODEL") ?? "claude-haiku-4-5",
    max_tokens: 2000,
    system: [{ type: "text", text: LISTING_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: encodeBase64(image) } },
          { type: "text", text: buildListingUserPrompt(marketplace, sellerNote ?? undefined) },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(ListingSchema) },
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`listing generation failed: stop_reason=${response.stop_reason}`);
  }
  return clampListing(response.parsed_output, marketplace);
}
