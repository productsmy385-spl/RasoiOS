"use client";

import * as React from "react";
import { createCategoryAction, updateCategoryAction } from "@/app/restaurant/menu/categories-actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Form, SubmitButton } from "@/components/ui/form";
import { TextArea, TextField } from "@/components/ui/inputs";
import type { MenuCategoryDto } from "@/lib/data/menu";
import { IconPicker } from "./icon-picker";

/**
 * Create / edit a menu category (SA-MENU-01, SA-MENU-02). The shared <Form> dispatches the Server Action and puts the
 * server's field errors back on the matching fields, so a duplicate name (422 NAME_TAKEN) lands on "Name" with the
 * summary at the top. Nothing is reported as saved until the action returns `ok`.
 */
const text = (data: FormData, key: string) => String(data.get(key) ?? "");

export function CategoryFormDialog({
  open,
  category,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** `null` creates a category; a DTO edits it. */
  category: MenuCategoryDto | null;
  onClose: () => void;
  onSaved: (category: MenuCategoryDto, mode: "created" | "updated") => void;
}) {
  const editing = category !== null;

  async function submit(data: FormData) {
    const fields = { name: text(data, "name"), description: text(data, "description"), iconKey: text(data, "iconKey") };
    return editing ? updateCategoryAction({ categoryId: category.id, ...fields }) : createCategoryAction(fields);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${category.name}` : "Add category"}
      description={editing ? "Categories group items on your menu and on your public website." : "Categories group items on your menu. New categories are added at the end and are published."}
    >
      <Form
        action={submit}
        onSuccess={(saved) => {
          onSaved(saved, editing ? "updated" : "created");
          onClose();
        }}
      >
        <TextField name="name" label="Name" required maxLength={80} defaultValue={category?.name ?? ""} placeholder="Starters" autoComplete="off" />
        <TextArea
          name="description"
          label="Description"
          rows={3}
          maxLength={500}
          showCount
          defaultValue={category?.description ?? ""}
          help="Shown under the category heading on your public website."
        />
        <IconPicker name="iconKey" label="Icon" defaultValue={category?.iconKey ?? ""} help="Used where a category has no picture." />
        <div className="mt-2 flex flex-col-reverse gap-2 border-t border-border-subtle pt-4 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton>{editing ? "Save changes" : "Add category"}</SubmitButton>
        </div>
      </Form>
    </Dialog>
  );
}
