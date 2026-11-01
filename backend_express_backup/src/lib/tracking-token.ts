import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

export function trackingToken(restaurantId: string, idempotencyKey: string): string {
  return createHmac("sha256", env.TRACKING_TOKEN_SECRET)
    .update(`${restaurantId}:${idempotencyKey}`)
    .digest("base64url");
}

export function hashTrackingToken(token: string): string {
  return createHmac("sha256", env.TRACKING_TOKEN_SECRET).update(token).digest("hex");
}

export function safeTokenMatch(candidate: string, storedHash: string): boolean {
  const candidateHash = Buffer.from(hashTrackingToken(candidate), "hex");
  const expectedHash = Buffer.from(storedHash, "hex");
  return candidateHash.length === expectedHash.length && timingSafeEqual(candidateHash, expectedHash);
}
