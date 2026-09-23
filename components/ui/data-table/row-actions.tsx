"use client";

import { Ellipsis } from "lucide-react";
import { IconButton } from "../icon-button";
import { Menu, type MenuItem } from "../menu";

/**
 * Row actions (S1-P08-T007, design.md §8 Tables): an `Ellipsis` icon button opening a menu of the actions the user may
 * take on this row. Pass only permitted actions; the server re-checks each one (SC-RBAC-08).
 */
export function RowActions({ label, items }: { /** e.g. "Actions for order 1042" */ label: string; items: readonly MenuItem[] }) {
  if (items.length === 0) return null;
  return <Menu items={items} trigger={(props) => <IconButton {...props} icon={Ellipsis} size="sm" aria-label={label} className="h-11 w-11 sm:h-8 sm:w-8" />} />;
}
