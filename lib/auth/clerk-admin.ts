import "server-only";
import { createClerkClient } from "@clerk/nextjs/server";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Clerk Backend API wrapper (S1-P03-T004, SC-AUTH-08): invitations and session revocation.
 *
 * Failure contract for callers (staff and tenant services, S1-P06/S1-P07):
 * - Every call either succeeds or throws `ClerkAdminError` with a stable code; nothing is swallowed.
 * - Call Clerk *before* committing local rows that depend on it (invitations), or *after* committing a local
 *   deactivation (session revocation). If the local transaction fails after an invitation was created, revoke it
 *   (`revokeInvitation`), so local and Clerk state never disagree without a retry path.
 * - Logs mask email addresses; tokens, tickets and secrets are never logged.
 */

export type ClerkAdminErrorCode = "INVITATION_FAILED" | "INVITATION_REVOKE_FAILED" | "SESSION_REVOKE_FAILED" | "CLERK_TIMEOUT";

export class ClerkAdminError extends AppError {
  constructor(code: ClerkAdminErrorCode, message: string) {
    super(message, code === "CLERK_TIMEOUT" ? 503 : 502, code);
  }
}

/** `asha.rao@example.com` → `a***@example.com` */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 1)}***@${domain}`;
}

type ClerkClient = ReturnType<typeof createClerkClient>;

export type ClerkAdminOptions = { secretKey?: string; apiUrl?: string; timeoutMs?: number };

function clientFor(options: ClerkAdminOptions): ClerkClient {
  return createClerkClient({
    secretKey: options.secretKey ?? process.env.CLERK_SECRET_KEY,
    ...(options.apiUrl ? { apiUrl: options.apiUrl } : {}),
  });
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ClerkAdminError("CLERK_TIMEOUT", "The identity provider did not respond in time. Try again.")), timeoutMs);
  });
  try {
    return await Promise.race([operation, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function statusOf(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

export function createClerkAdmin(options: ClerkAdminOptions = {}) {
  const clerk = clientFor(options);
  const timeoutMs = options.timeoutMs ?? 8_000;

  async function call<T>(code: ClerkAdminErrorCode, message: string, context: Record<string, unknown>, fn: () => Promise<T>): Promise<T> {
    try {
      return await withTimeout(fn(), timeoutMs);
    } catch (error) {
      if (error instanceof ClerkAdminError) {
        logger.error("clerk.timeout", { ...context, operation: code });
        throw error;
      }
      logger.error("clerk.request_failed", { ...context, operation: code, status: statusOf(error) });
      throw new ClerkAdminError(code, message);
    }
  }

  return {
    /** Sends a Clerk invitation email. `redirectUrl` must be an absolute URL of this app (sign-up page). */
    async createInvitation(email: string, redirectUrl: string): Promise<{ invitationId: string }> {
      const invitation = await call("INVITATION_FAILED", "The invitation could not be sent. Try again.", { email: maskEmail(email) }, () =>
        clerk.invitations.createInvitation({ emailAddress: email, redirectUrl, notify: true, ignoreExisting: true }),
      );
      logger.info("clerk.invitation_created", { email: maskEmail(email), invitationId: invitation.id });
      return { invitationId: invitation.id };
    },

    /** Revokes a pending invitation. Already revoked or accepted invitations (404/400/422) count as done. */
    async revokeInvitation(invitationId: string): Promise<void> {
      try {
        await withTimeout(clerk.invitations.revokeInvitation(invitationId), timeoutMs);
      } catch (error) {
        const status = statusOf(error);
        if (status === 404 || status === 400 || status === 422) return;
        if (error instanceof ClerkAdminError) throw error;
        logger.error("clerk.request_failed", { operation: "INVITATION_REVOKE_FAILED", invitationId, status });
        throw new ClerkAdminError("INVITATION_REVOKE_FAILED", "The invitation could not be revoked. Try again.");
      }
    },

    /** Signs a user out everywhere by revoking all active Clerk sessions. Returns how many were revoked. */
    async revokeUserSessions(clerkUserId: string): Promise<number> {
      return call("SESSION_REVOKE_FAILED", "Sessions could not be revoked. Try again.", { clerkUserId }, async () => {
        const sessions = await clerk.sessions.getSessionList({ userId: clerkUserId, status: "active" });
        for (const session of sessions.data) {
          await clerk.sessions.revokeSession(session.id);
        }
        logger.info("clerk.sessions_revoked", { clerkUserId, count: sessions.data.length });
        return sessions.data.length;
      });
    },
  };
}

export type ClerkAdmin = ReturnType<typeof createClerkAdmin>;

let shared: ClerkAdmin | undefined;

/** The application's Clerk admin client (configured from CLERK_SECRET_KEY). */
export function clerkAdmin(): ClerkAdmin {
  shared ??= createClerkAdmin();
  return shared;
}
