import { z } from "zod";
import { MARKETPLACE_RULES, type Marketplace } from "./marketplaces.ts";

/**
 * Shape the LLM must return. Length limits are NOT in the schema on purpose:
 * structured outputs don't enforce them, so we clamp with `clampListing` instead
 * of failing the whole request.
 */
export const ListingSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  category: z.string(),
  materials: z.array(z.string()),
  colors: z.array(z.string()),
});
export type Listing = z.infer<typeof ListingSchema>;

function clampText(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

export function clampListing(listing: Listing, marketplace: Marketplace): Listing {
  const rules = MARKETPLACE_RULES[marketplace];
  const seen = new Set<string>();
  const tags = listing.tags
    .map((t) => t.trim().replace(/^#/, "").toLowerCase())
    .filter((t) => t.length > 0 && t.length <= rules.tagMaxChars)
    .filter((t) => (seen.has(t) ? false : (seen.add(t), true)))
    .slice(0, rules.maxTags);

  return {
    ...listing,
    title: clampText(listing.title, rules.titleMaxChars),
    description: clampText(listing.description, rules.descriptionMaxChars),
    tags,
  };
}
