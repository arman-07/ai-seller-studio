import { test } from "node:test";
import assert from "node:assert/strict";
import { clampListing, type Listing } from "./listing.ts";

const base: Listing = {
  title: "Handmade ceramic mug",
  description: "A mug.",
  tags: [],
  category: "Home",
  materials: [],
  colors: [],
};

test("clamps etsy title to 140 chars on a word boundary", () => {
  const out = clampListing({ ...base, title: "word ".repeat(60) }, "etsy");
  assert.ok(out.title.length <= 140);
  assert.ok(!out.title.endsWith(" "));
});

test("etsy tags: max 13, <=20 chars, deduped, no #", () => {
  const tags = ["#Mug", "mug", "a".repeat(21), ...Array.from({ length: 20 }, (_, i) => `tag${i}`)];
  const out = clampListing({ ...base, tags }, "etsy");
  assert.equal(out.tags.length, 13);
  assert.equal(out.tags[0], "mug");
  assert.ok(out.tags.every((t) => t.length <= 20 && !t.startsWith("#")));
  assert.equal(new Set(out.tags).size, out.tags.length);
});

test("ebay has no tags", () => {
  const out = clampListing({ ...base, tags: ["x"] }, "ebay");
  assert.deepEqual(out.tags, []);
});
