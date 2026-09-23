import Link from "next/link";

// Global not-found page (S1-P04-T005). Missing and other-tenant resources look identical (SC-TEN-04).
export default function NotFound() {
  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <p className="text-sm font-semibold text-fg-accent">404</p>
        <h1 className="font-display text-2xl font-bold text-fg-primary">Page not found</h1>
        <p className="text-sm text-fg-secondary">The page you asked for doesn&apos;t exist or isn&apos;t available to you.</p>
        <Link href="/" className="inline-block px-4 py-2 rounded-xl bg-action-primary hover:bg-action-primary-hover text-action-primary-fg text-sm font-semibold">
          Go home
        </Link>
      </div>
    </main>
  );
}
