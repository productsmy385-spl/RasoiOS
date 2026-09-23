"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { updateRestaurantProfileAction } from "@/app/restaurant/settings/actions";
import { Card } from "@/components/ui/card";
import { DescriptionList, type DescriptionItem } from "@/components/ui/description-list";
import { Form, SubmitButton } from "@/components/ui/form";
import { TextArea } from "@/components/ui/inputs/text-area";
import { TextField } from "@/components/ui/inputs/text-field";
import { useToast } from "@/components/ui/toast";
import type { RestaurantSettingsDto } from "@/lib/data/restaurant";
import type { ActionResult } from "@/lib/http/action";

/**
 * Profile (S1-P07-T005; api.md SA-RST-01): the restaurant's name, how it describes itself, and how diners reach it.
 * These fields are what the public website prints, so the form says so rather than leaving it to be discovered.
 *
 * Without `restaurant:update` the same values are shown as a description list: a disabled form invites an edit that
 * cannot be saved, and a read-only role should not have to discover the refusal (SC-RBAC-08 still re-checks anyway).
 */
export function ProfileForm({ restaurant, canEdit }: { restaurant: RestaurantSettingsDto; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();

  if (!canEdit) {
    const items: DescriptionItem[] = [
      { term: "Name", value: restaurant.name },
      { term: "Description", value: restaurant.description ?? "Not set" },
      { term: "Phone", value: restaurant.phoneE164 ?? "Not set" },
      { term: "Email", value: restaurant.email ?? "Not set" },
      { term: "Address", value: addressOf(restaurant) },
    ];
    return (
      <Card padding="feature">
        <DescriptionList items={items} />
        <p className="mt-4 text-caption text-fg-secondary">Your role can see these details but not change them.</p>
      </Card>
    );
  }

  return (
    <Card padding="feature">
      <Form
        action={(formData: FormData): Promise<ActionResult<unknown>> => {
          const text = (name: string) => String(formData.get(name) ?? "").trim();
          return updateRestaurantProfileAction({
            name: text("name"),
            description: text("description"),
            phoneE164: text("phoneE164"),
            email: text("email"),
            addressLine1: text("addressLine1"),
            addressLine2: text("addressLine2"),
            city: text("city"),
            region: text("region"),
            postalCode: text("postalCode"),
          });
        }}
        onSuccess={() => {
          toast.success("Profile saved.");
          router.refresh();
        }}
      >
        <TextField name="name" label="Restaurant name" required defaultValue={restaurant.name} autoComplete="organization" help="Shown on the website and on every receipt." />
        <TextArea
          name="description"
          label="Description"
          defaultValue={restaurant.description ?? ""}
          maxLength={1000}
          showCount
          help="A short paragraph for the website. Leave it empty to show none."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="phoneE164" label="Phone" type="tel" defaultValue={restaurant.phoneE164 ?? ""} autoComplete="tel" help="International format, e.g. +919876543210." />
          <TextField name="email" label="Email" type="email" defaultValue={restaurant.email ?? ""} autoComplete="email" />
        </div>
        <TextField name="addressLine1" label="Address line 1" defaultValue={restaurant.addressLine1 ?? ""} autoComplete="address-line1" />
        <TextField name="addressLine2" label="Address line 2" defaultValue={restaurant.addressLine2 ?? ""} autoComplete="address-line2" />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField name="city" label="City" defaultValue={restaurant.city ?? ""} autoComplete="address-level2" />
          <TextField name="region" label="State or region" defaultValue={restaurant.region ?? ""} autoComplete="address-level1" />
          <TextField name="postalCode" label="Postal code" defaultValue={restaurant.postalCode ?? ""} autoComplete="postal-code" />
        </div>
        <p className="text-caption text-fg-secondary">
          Leaving a field empty clears it. Whether the website shows the phone, email and address is a separate choice on the website page.
        </p>
        <div className="flex justify-end">
          <SubmitButton>Save profile</SubmitButton>
        </div>
      </Form>
    </Card>
  );
}

function addressOf(restaurant: RestaurantSettingsDto): string {
  const parts = [restaurant.addressLine1, restaurant.addressLine2, restaurant.city, restaurant.region, restaurant.postalCode].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Not set";
}
