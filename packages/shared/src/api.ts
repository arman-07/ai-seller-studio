import { z } from "zod";
import { MARKETPLACES } from "./marketplaces.ts";
import { ListingSchema } from "./listing.ts";

/**
 * Body of POST /functions/v1/process-product (shared by iOS and web).
 * The client uploads the white-background photo first (composed on device),
 * then calls this to get the listing text and, optionally, an AI scene.
 */
export const ProcessProductRequest = z.object({
  productId: z.uuid(),
  /** Storage path in bucket `product-images`, must start with "<user_id>/". */
  studioPath: z.string().min(1),
  aiScene: z.boolean().default(false),
});
export type ProcessProductRequest = z.infer<typeof ProcessProductRequest>;

export const ProcessProductResponse = z.object({
  productId: z.uuid(),
  listing: ListingSchema,
  aiScenePath: z.string().nullable(),
});
export type ProcessProductResponse = z.infer<typeof ProcessProductResponse>;

export const USAGE_LIMIT_ERROR = "usage_limit_reached";
