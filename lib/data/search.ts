/**
 * Prisma's `contains` / `startsWith` filters become SQL `LIKE`/`ILIKE` patterns without escaping `%` and `_`, so a
 * search for "%" would match every row (ADV-018). This escapes the pattern characters (PostgreSQL's default LIKE escape
 * is backslash) so user text is always matched literally.
 */
export function likeLiteral(text: string): string {
  return text.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
