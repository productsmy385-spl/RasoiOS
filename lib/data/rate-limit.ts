import "server-only";
import { db } from "@/lib/db/prisma";

/**
 * RATE_LIMIT_BUCKET access (ADR-011 §1, S1-P03-T007). Not tenant data: keys are `scope:sha256(identifier)`.
 * One atomic upsert per hit; concurrent hits on the same key serialise on the row lock, so counts are exact.
 */
export async function hitBucket(bucketKey: string, windowStart: Date, windowEnd: Date): Promise<{ hitCount: number; windowStart: Date }> {
  const rows = await db.$queryRaw<{ hit_count: number; window_start: Date }[]>`
    INSERT INTO rate_limit_buckets (bucket_key, window_start, hit_count, expires_at)
    VALUES (${bucketKey}, ${windowStart}, 1, ${windowEnd})
    ON CONFLICT (bucket_key) DO UPDATE SET
      hit_count = CASE
        WHEN rate_limit_buckets.window_start < EXCLUDED.window_start THEN 1
        ELSE rate_limit_buckets.hit_count + 1
      END,
      window_start = GREATEST(rate_limit_buckets.window_start, EXCLUDED.window_start),
      expires_at = GREATEST(rate_limit_buckets.expires_at, EXCLUDED.expires_at)
    RETURNING hit_count, window_start`;
  return { hitCount: Number(rows[0].hit_count), windowStart: rows[0].window_start };
}

/** Deletes up to `batch` expired buckets; returns how many were removed. */
export async function deleteExpiredBuckets(now: Date, batch = 500): Promise<number> {
  return db.$executeRaw`
    DELETE FROM rate_limit_buckets
    WHERE ctid IN (SELECT ctid FROM rate_limit_buckets WHERE expires_at < ${now} LIMIT ${batch})`;
}
