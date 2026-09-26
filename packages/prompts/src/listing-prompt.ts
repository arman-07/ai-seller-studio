import { MARKETPLACE_RULES, type Marketplace } from "../../shared/src/index.ts";

/**
 * Stable across requests (prompt-cacheable): keep per-request data out of here.
 */
export const LISTING_SYSTEM_PROMPT = `You write marketplace listings for small online sellers.
You get one product photo and optionally a short note from the seller.

Rules:
- Describe only what is visible in the photo or stated in the seller note. Never invent brand, size, material or condition; if unknown, leave it out.
- Write in English for US/EU buyers.
- Title: most searchable words first, no ALL CAPS, no emoji, no quotes.
- Tags: buyer search phrases (2-3 words each), lowercase, no duplicates of title words where avoidable.
- Description: plain text, short paragraphs and "- " bullets, no markdown headings.
- category: the most likely marketplace category path, e.g. "Home & Living > Kitchen > Mugs".
- materials and colors: only if clearly visible; otherwise empty arrays.`;

export function buildListingUserPrompt(marketplace: Marketplace, sellerNote?: string): string {
  const r = MARKETPLACE_RULES[marketplace];
  const tagRule =
    r.maxTags > 0
      ? `Up to ${r.maxTags} tags, each at most ${r.tagMaxChars} characters.`
      : "Return an empty tags array (this marketplace has no tags).";
  const note = sellerNote?.trim() ? `\n\nSeller note: ${sellerNote.trim()}` : "";
  return `Marketplace: ${r.label}
Style: ${r.style}
Title at most ${r.titleMaxChars} characters. Description at most ${r.descriptionMaxChars} characters. ${tagRule}${note}`;
}
