export const MARKETPLACES = ["etsy", "ebay", "vinted", "shopify"] as const;
export type Marketplace = (typeof MARKETPLACES)[number];

export interface MarketplaceRules {
  label: string;
  titleMaxChars: number;
  maxTags: number;
  tagMaxChars: number;
  descriptionMaxChars: number;
  /** Short style hint passed to the LLM prompt. */
  style: string;
}

export const MARKETPLACE_RULES: Record<Marketplace, MarketplaceRules> = {
  etsy: {
    label: "Etsy",
    titleMaxChars: 140,
    maxTags: 13,
    tagMaxChars: 20,
    descriptionMaxChars: 5000,
    style:
      "Warm, handmade tone. Front-load the most searchable keywords in the title. Description: short story, then bullet list of materials, size, care.",
  },
  ebay: {
    label: "eBay",
    titleMaxChars: 80,
    maxTags: 0,
    tagMaxChars: 0,
    descriptionMaxChars: 4000,
    style:
      "Factual, keyword-dense title (brand, model, size, color, condition). Description: condition first, then specs as bullets.",
  },
  vinted: {
    label: "Vinted",
    titleMaxChars: 100,
    maxTags: 5,
    tagMaxChars: 20,
    descriptionMaxChars: 2000,
    style:
      "Casual, short, honest. Brand, size, condition, flaws. Hashtag-style tags without the # sign.",
  },
  shopify: {
    label: "Shopify",
    titleMaxChars: 255,
    maxTags: 10,
    tagMaxChars: 30,
    descriptionMaxChars: 5000,
    style:
      "Brand-store tone. Benefit-led description with a short intro paragraph and feature bullets. SEO-friendly title.",
  },
};
