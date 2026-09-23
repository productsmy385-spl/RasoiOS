/**
 * Route policy for the middleware (S1-P03-T002, security.md §2.2). Pure functions: no Clerk, no Next.js imports,
 * so the decision table is unit-tested directly.
 *
 * The middleware is a coarse gate only (SC-AUTH-04): every loader, action and route handler still resolves the
 * session and permissions itself. Public routes never grant tenant data.
 */

export type RouteKind =
  | "public" // no session needed (marketing, public menu, sign-in, health)
  | "agent" // print-agent API: bearer-token auth in the handler, never a Clerk session (ADR-007)
  | "webhook" // Clerk webhook: Svix signature in the handler (ADR-011)
  | "api" // session API: 401 JSON when signed out
  | "page"; // everything else: redirect to /sign-in when signed out

// `/sitemap.xml` and `/robots.txt` are generated from published public websites only (LD-PUB-03, S1-P09-T005).
const PUBLIC_EXACT = new Set(["/", "/offline", "/api/health", "/api/ready", "/manifest.json", "/sw.js", "/favicon.ico", "/robots.txt", "/sitemap.xml"]);
const PUBLIC_PREFIXES = ["/r/", "/sign-in", "/sign-up", "/icons/"];

function matchesPrefix(pathname: string, prefix: string): boolean {
  // "/sign-in" matches "/sign-in" and "/sign-in/…" but not "/sign-inx".
  if (prefix.endsWith("/")) return pathname.startsWith(prefix);
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function classifyRoute(pathname: string): RouteKind {
  if (pathname === "/api/webhooks/clerk") return "webhook";
  if (pathname === "/api/v1/print-agent" || pathname.startsWith("/api/v1/print-agent/")) return "agent";
  if (PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIXES.some((p) => matchesPrefix(pathname, p))) return "public";
  if (pathname === "/api" || pathname.startsWith("/api/")) return "api";
  return "page";
}

export type GateDecision =
  | { action: "next" }
  | { action: "redirect"; location: string }
  | { action: "json"; status: 401; body: { error: { code: "UNAUTHENTICATED"; message: string; requestId: string } } };

/** What the middleware does for a request, given whether a Clerk session is present. */
export function gate(pathname: string, search: string, signedIn: boolean, requestId: string): GateDecision {
  const kind = classifyRoute(pathname);
  if (kind === "public" || kind === "agent" || kind === "webhook" || signedIn) return { action: "next" };
  if (kind === "api") {
    return { action: "json", status: 401, body: { error: { code: "UNAUTHENTICATED", message: "Sign in to continue.", requestId } } };
  }
  const target = `${pathname}${search}`;
  return { action: "redirect", location: `/sign-in?redirect_url=${encodeURIComponent(target)}` };
}

const REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/;

/** Keeps a well-formed incoming `x-request-id` (e.g. from Railway's proxy); otherwise generates a UUID. */
export function ensureRequestId(incoming: string | null | undefined, generate: () => string): string {
  return incoming && REQUEST_ID.test(incoming) ? incoming : generate();
}
