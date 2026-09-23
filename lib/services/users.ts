import "server-only";
import type { WebhookEvent } from "@clerk/nextjs/webhooks";
import { deactivateClerkUser, syncClerkProfile } from "@/lib/data/users";
import { logger } from "@/lib/logger";
import { now } from "@/lib/time/clock";
import { verifiedPrimaryEmailOf } from "@/lib/auth/session";

/**
 * Applies a verified Clerk webhook event to local identity data (RH-AUTH-01, S1-P03-T008).
 * Only `user.updated` and `user.deleted` change anything; every other event type is acknowledged and ignored.
 * Both handlers are idempotent, so a replay inside the signature tolerance window has no further effect (ADR-011 §5).
 */
export async function applyClerkUserEvent(event: WebhookEvent, requestId: string): Promise<string> {
  switch (event.type) {
    case "user.updated": {
      const data = event.data;
      const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ").trim() || null;
      const verifiedPrimaryEmail = verifiedPrimaryEmailOf({
        primaryEmailAddressId: data.primary_email_address_id,
        emailAddresses: data.email_addresses.map((e) => ({
          id: e.id,
          emailAddress: e.email_address,
          verification: e.verification ? { status: e.verification.status } : null,
        })),
      });
      const outcome = await syncClerkProfile({ clerkUserId: data.id, verifiedPrimaryEmail, fullName }, requestId);
      if (outcome === "EMAIL_CONFLICT") logger.warn("security.email_sync_conflict", { requestId });
      return outcome;
    }
    case "user.deleted": {
      if (!event.data.id) return "IGNORED";
      return deactivateClerkUser(event.data.id, now(), requestId);
    }
    default:
      return "IGNORED";
  }
}
