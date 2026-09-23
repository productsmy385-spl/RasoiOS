import type { ComponentType } from "react";

/**
 * Reading what a Server Component decided, without a browser (testing.md §2: the console has no authenticated e2e
 * path because Clerk has no test users in this environment).
 *
 * `invokeLoader(Page, …)` runs the async Server Component and hands back its React element tree. These helpers walk
 * that tree, so a test can assert the real thing the page did: which loader data it passed down, which capability
 * flags it resolved, which empty/error branch it chose, and what a table column actually renders for a row. Client
 * components are not executed — they are elements with props — which is exactly the boundary being asserted.
 */
export type ElementLike = { type: unknown; props: Record<string, unknown> };

export function isElement(node: unknown): node is ElementLike {
  return typeof node === "object" && node !== null && "props" in node && "type" in node;
}

/** Concatenated text of an element tree (literal string and number children only). */
export function textOf(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return isElement(node) ? textOf(node.props.children) : "";
}

function* walk(node: unknown): Generator<ElementLike> {
  if (Array.isArray(node)) {
    for (const child of node) yield* walk(child);
    return;
  }
  if (!isElement(node)) return;
  yield node;
  yield* walk(node.props.children);
  // Elements passed as props (a table's `empty` node, a card's `action` slot, a header's `actions`).
  for (const [key, value] of Object.entries(node.props)) {
    if (key === "children") continue;
    if (Array.isArray(value) || isElement(value)) yield* walk(value);
  }
}

export function findAll(node: unknown, predicate: (element: ElementLike) => boolean): ElementLike[] {
  return [...walk(node)].filter(predicate);
}

export function findElement(node: unknown, predicate: (element: ElementLike) => boolean): ElementLike | null {
  return findAll(node, predicate)[0] ?? null;
}

/** The first element of a given component, with its props typed. Identity works because the test imports the same module. */
export function findComponent<P>(node: unknown, component: ComponentType<P> | ((props: P) => unknown)): (ElementLike & { props: P }) | null {
  const found = findElement(node, (element) => element.type === component);
  return (found as (ElementLike & { props: P }) | null) ?? null;
}

export function requireComponent<P>(node: unknown, component: ComponentType<P> | ((props: P) => unknown), label: string): P {
  const found = findComponent<P>(node, component);
  if (!found) throw new Error(`Expected the page to render <${label}>`);
  return found.props;
}

/** Whether the page rendered any element of `component` (e.g. the "Add item" link, an <ErrorState>). */
export function hasComponent(node: unknown, component: unknown): boolean {
  return findElement(node, (element) => element.type === component) !== null;
}

/** Links the page rendered, by href — the capability-filtered actions of a page header, for instance. */
export function hrefs(node: unknown): string[] {
  return findAll(node, (element) => typeof element.props.href === "string").map((element) => String(element.props.href));
}
