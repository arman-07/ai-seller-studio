import { test } from "node:test";
import assert from "node:assert/strict";
import { buildListingUserPrompt } from "./listing-prompt.ts";

test("includes marketplace limits and seller note", () => {
  const p = buildListingUserPrompt("etsy", "  size M, vintage 90s ");
  assert.match(p, /Etsy/);
  assert.match(p, /140 characters/);
  assert.match(p, /13 tags/);
  assert.match(p, /Seller note: size M, vintage 90s$/);
});

test("ebay asks for no tags", () => {
  assert.match(buildListingUserPrompt("ebay"), /empty tags array/);
});
