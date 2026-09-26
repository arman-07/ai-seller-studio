/**
 * Week 1-2 quality check: run the listing prompt on local photos, no app needed.
 *
 *   ANTHROPIC_API_KEY=... pnpm --filter @studio/prompts try eval-photos/mug.jpg etsy "handmade, 350ml"
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { ListingSchema, clampListing, MARKETPLACES, type Marketplace } from "../../shared/src/index.ts";
import { LISTING_SYSTEM_PROMPT, buildListingUserPrompt } from "../src/index.ts";

const [photo, marketplaceArg = "etsy", sellerNote] = process.argv.slice(2);
if (!photo) {
  console.error("usage: try-listing <photo> [etsy|ebay|vinted|shopify] [seller note]");
  process.exit(1);
}
if (!MARKETPLACES.includes(marketplaceArg as Marketplace)) {
  console.error(`unknown marketplace: ${marketplaceArg}`);
  process.exit(1);
}
const marketplace = marketplaceArg as Marketplace;

const mediaTypes = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" } as const;
const mediaType = mediaTypes[extname(photo).toLowerCase() as keyof typeof mediaTypes];
if (!mediaType) {
  console.error("photo must be jpg, png or webp");
  process.exit(1);
}

const client = new Anthropic();
const response = await client.messages.parse({
  model: process.env.CLAUDE_MODEL ?? "claude-haiku-4-5",
  max_tokens: 2000,
  system: [{ type: "text", text: LISTING_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
  messages: [
    {
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: readFileSync(photo).toString("base64") } },
        { type: "text", text: buildListingUserPrompt(marketplace, sellerNote) },
      ],
    },
  ],
  output_config: { format: zodOutputFormat(ListingSchema) },
});

if (response.stop_reason === "refusal" || !response.parsed_output) {
  console.error("No listing returned, stop_reason:", response.stop_reason);
  process.exit(1);
}
console.log(JSON.stringify(clampListing(response.parsed_output, marketplace), null, 2));
console.error("usage:", response.usage);
