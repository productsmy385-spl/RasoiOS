"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DietaryType } from "@prisma/client";
import { RotateCcw, Save } from "lucide-react";
import {
  createMenuItemAction,
  replaceMenuItemAddonsAction,
  replaceMenuItemVariantsAction,
  setMenuItemAvailabilityAction,
  setMenuItemPublishedAction,
  updateMenuItemAction,
} from "@/app/restaurant/menu/items-actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorSummary, type SummaryItem } from "@/components/ui/form";
import { MoneyField, PercentField, Select, Switch, TextArea, TextField } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/toast";
import type { KitchenSectionOptionDto, MenuCategoryDto, MenuItemDetailDto } from "@/lib/data/menu";
import type { ActionResult } from "@/lib/http/action";
import { failureText, isStaleConflict, UNREACHABLE, type ActionFailure } from "./feedback";
import { IconPicker } from "./icon-picker";
import { OptionEditor, type OptionRow } from "./option-editor";
import { PublicItemPreview } from "./public-item-preview";

/**
 * Menu item editor (S1-P10-T007; frontend.md §5.3 `/restaurant/menu/items/new` and `/[itemId]`).
 *
 * One screen, three Server Actions: SA-MENU-06/07 write the item itself, SA-MENU-12 and SA-MENU-13 replace the
 * variant and add-on sets — and only when those sets actually changed, because a replace-set always writes its own
 * audit row. They run in that order and each result replaces what is on screen, so `expectedUpdatedAt` is always the
 * row the editor last saw. A 409 CONFLICT means someone else saved first: nothing of this edit was written, and the
 * only honest answer is to reload, which is what the banner offers.
 *
 * Prices are decimal strings the whole way (ADR-010) — nothing here turns money into a number. Publication and
 * availability have their own actions and permissions, so they are their own controls, not fields of the form.
 */
const VARIANT_LIMIT = 20;
const ADDON_LIMIT = 30;

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  description: "Description",
  imageUrl: "Image link",
  iconKey: "Icon",
  categoryId: "Category",
  kitchenSectionId: "Kitchen section",
  basePrice: "Base price",
  taxRate: "Tax rate",
  dietaryType: "Food type",
  prepTimeMinutes: "Preparation time",
  expectedUpdatedAt: "This item",
};

const DIETARY_OPTIONS = [
  { value: "VEG", label: "Veg" },
  { value: "NON_VEG", label: "Non-veg" },
  { value: "EGG", label: "Egg" },
];

type FormState = {
  name: string;
  description: string;
  imageUrl: string;
  iconKey: string;
  categoryId: string;
  kitchenSectionId: string;
  dietaryType: string;
  prepTimeMinutes: string;
};

function formOf(item: MenuItemDetailDto | null, fallbackCategoryId: string): FormState {
  return {
    name: item?.name ?? "",
    description: item?.description ?? "",
    imageUrl: item?.imageUrl ?? "",
    iconKey: item?.iconKey ?? "",
    categoryId: item?.categoryId ?? fallbackCategoryId,
    kitchenSectionId: item?.kitchenSectionId ?? "",
    dietaryType: item?.dietaryType ?? "",
    prepTimeMinutes: item?.prepTimeMinutes === null || item?.prepTimeMinutes === undefined ? "" : String(item.prepTimeMinutes),
  };
}

function rowsOf(options: ReadonlyArray<{ id: string; name: string; price: string; isAvailable: boolean; isDefault?: boolean }>): OptionRow[] {
  return options.map((option) => ({
    key: option.id,
    id: option.id,
    name: option.name,
    price: option.price,
    isDefault: option.isDefault ?? false,
    isAvailable: option.isAvailable,
  }));
}

const withId = (row: OptionRow) => (row.id ? { id: row.id } : {});
/** SA-MENU-12 payload: the schema is strict, so a variant carries exactly these keys. */
const variantPayload = (rows: readonly OptionRow[]) => rows.map((row) => ({ ...withId(row), name: row.name.trim(), price: row.price ?? "", isDefault: row.isDefault, isAvailable: row.isAvailable }));
/** SA-MENU-13 payload: add-ons have no default flag, and an unknown key would be a 422. */
const addonPayload = (rows: readonly OptionRow[]) => rows.map((row) => ({ ...withId(row), name: row.name.trim(), price: row.price ?? "", isAvailable: row.isAvailable }));

const snapshotOf = (form: FormState, basePrice: string | null, taxRate: string | null, variants: readonly OptionRow[], addons: readonly OptionRow[]) =>
  JSON.stringify([form, basePrice, taxRate, variantPayload(variants), addonPayload(addons)]);

export type ItemEditorProps = {
  /** `null` creates a new item (SA-MENU-06); a DTO edits an existing one (SA-MENU-07). */
  item: MenuItemDetailDto | null;
  categories: readonly MenuCategoryDto[];
  kitchenSections: readonly KitchenSectionOptionDto[];
  canManage: boolean;
  currencyCode: string;
};

export function ItemEditor({ item, categories, kitchenSections, canManage, currencyCode }: ItemEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const summaryRef = React.useRef<HTMLDivElement>(null);

  const [saved, setSaved] = React.useState<MenuItemDetailDto | null>(item);
  const [form, setForm] = React.useState<FormState>(() => formOf(item, categories[0]?.id ?? ""));
  const [basePrice, setBasePrice] = React.useState<string | null>(item?.basePrice ?? null);
  const [taxRate, setTaxRate] = React.useState<string | null>(item?.taxRate ?? null);
  const [variants, setVariants] = React.useState<OptionRow[]>(() => rowsOf(item?.variants ?? []));
  const [addons, setAddons] = React.useState<OptionRow[]>(() => rowsOf(item?.addons ?? []));

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [failure, setFailure] = React.useState<{ message: string; requestId?: string; conflict: boolean } | null>(null);
  const [pending, setPending] = React.useState(false);
  const [everSaved, setEverSaved] = React.useState(false);

  const baseline = React.useRef(snapshotOf(form, basePrice, taxRate, variants, addons));
  const dirty = snapshotOf(form, basePrice, taxRate, variants, addons) !== baseline.current;
  const readOnly = !canManage;

  // Unsaved-changes guard (frontend.md §5.3): a browser reload or tab close asks first.
  React.useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  React.useEffect(() => {
    if (failure) summaryRef.current?.focus();
  }, [failure]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const chosenCategory = categories.find((category) => category.id === form.categoryId) ?? null;

  function handleFailure(result: ActionFailure) {
    setFieldErrors(result.error.fieldErrors ?? {});
    setFailure({
      message: failureText(result),
      requestId: result.error.code === "VALIDATION_ERROR" ? undefined : result.error.requestId,
      conflict: isStaleConflict(result),
    });
  }

  /** Adopt a server DTO as the new truth: what is on screen, what the next save compares against, and the baseline. */
  function adopt(detail: MenuItemDetailDto) {
    const nextForm = formOf(detail, form.categoryId);
    const nextVariants = rowsOf(detail.variants);
    const nextAddons = rowsOf(detail.addons);
    setSaved(detail);
    setForm(nextForm);
    setBasePrice(detail.basePrice);
    setTaxRate(detail.taxRate);
    setVariants(nextVariants);
    setAddons(nextAddons);
    baseline.current = snapshotOf(nextForm, detail.basePrice, detail.taxRate, nextVariants, nextAddons);
  }

  async function save() {
    setPending(true);
    setFieldErrors({});
    setFailure(null);
    try {
      const common = {
        categoryId: form.categoryId,
        kitchenSectionId: form.kitchenSectionId === "" ? null : form.kitchenSectionId,
        name: form.name.trim(),
        description: form.description,
        imageUrl: form.imageUrl.trim(),
        iconKey: form.iconKey,
        basePrice: basePrice ?? "",
        taxRate: taxRate ?? "",
        dietaryType: form.dietaryType === "" ? null : (form.dietaryType as DietaryType),
        prepTimeMinutes: /^\d{1,3}$/.test(form.prepTimeMinutes) ? Number(form.prepTimeMinutes) : null,
      };
      const existing = saved;
      const written: ActionResult<MenuItemDetailDto> = existing
        ? await updateMenuItemAction({ itemId: existing.id, expectedUpdatedAt: existing.updatedAt, ...common })
        : await createMenuItemAction(common);
      if (!written.ok) {
        handleFailure(written);
        return;
      }

      let detail = written.data;
      const goTo = existing ? null : `/restaurant/menu/items/${detail.id}`;

      // Replace-sets write an audit row every time, so they run only when the set really changed.
      if (JSON.stringify(variantPayload(variants)) !== JSON.stringify(variantPayload(rowsOf(detail.variants)))) {
        const result = await replaceMenuItemVariantsAction({ itemId: detail.id, variants: variantPayload(variants) });
        if (!result.ok) {
          adopt(detail);
          handleFailure(result);
          if (goTo) router.replace(goTo);
          return;
        }
        detail = result.data;
      }
      if (JSON.stringify(addonPayload(addons)) !== JSON.stringify(addonPayload(rowsOf(detail.addons)))) {
        const result = await replaceMenuItemAddonsAction({ itemId: detail.id, addons: addonPayload(addons) });
        if (!result.ok) {
          adopt(detail);
          handleFailure(result);
          if (goTo) router.replace(goTo);
          return;
        }
        detail = result.data;
      }

      adopt(detail);
      setEverSaved(true);
      toast.success(goTo ? `${detail.name} created.` : `${detail.name} saved.`);
      if (goTo) router.replace(goTo);
      else router.refresh();
    } catch {
      setFailure({ message: UNREACHABLE, conflict: false });
    } finally {
      setPending(false);
    }
  }

  async function toggle(kind: "published" | "available", next: boolean) {
    const before = saved;
    if (!before) return;
    setSaved({ ...before, ...(kind === "published" ? { isPublished: next } : { isAvailable: next }) });
    try {
      const result =
        kind === "published"
          ? await setMenuItemPublishedAction({ itemId: before.id, published: next })
          : await setMenuItemAvailabilityAction({ itemId: before.id, available: next });
      if (!result.ok) {
        setSaved(before);
        toast.error(failureText(result));
        return;
      }
      setSaved(result.data);
      toast.success(
        kind === "published"
          ? next
            ? `${before.name} is on your website.`
            : `${before.name} is hidden from your website.`
          : next
            ? `${before.name} is available again.`
            : `${before.name} is marked sold out.`,
      );
      router.refresh();
    } catch {
      setSaved(before);
      toast.error(UNREACHABLE);
    }
  }

  const summaryItems: SummaryItem[] = Object.entries(fieldErrors)
    .filter(([key]) => !key.startsWith("variants.") && !key.startsWith("addons."))
    .map(([key, messages]) => ({ label: FIELD_LABELS[key] ?? (key === "_" ? undefined : key), message: messages[0] }));

  const categoryOptions = categories.map((category) => ({ value: category.id, label: category.isPublished ? category.name : `${category.name} (hidden)` }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
        {failure && !failure.conflict && <ErrorSummary ref={summaryRef} title={failure.message} items={summaryItems} requestId={failure.requestId} />}
        {failure?.conflict && (
          <Alert
            tone="warning"
            title="Someone else changed this item"
            action={
              <Button variant="secondary" icon={RotateCcw} onClick={() => window.location.reload()}>
                Reload
              </Button>
            }
          >
            Reload to see their version, then make your change again. Nothing you typed has been saved.
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
            <CardDescription>What the dish is called and how it reads on your website.</CardDescription>
          </CardHeader>
          <div className="flex flex-col gap-4">
            <TextField
              label="Name"
              required
              maxLength={120}
              autoComplete="off"
              disabled={readOnly}
              value={form.name}
              error={fieldErrors.name?.[0]}
              onChange={(event) => set("name", event.target.value)}
            />
            <TextArea
              label="Description"
              rows={3}
              maxLength={1000}
              showCount
              disabled={readOnly}
              value={form.description}
              error={fieldErrors.description?.[0]}
              onChange={(event) => set("description", event.target.value)}
            />
            <Select
              label="Category"
              required
              disabled={readOnly}
              value={form.categoryId}
              options={categoryOptions}
              emptyOption={categories.length === 0 ? "No categories yet" : undefined}
              error={fieldErrors.categoryId?.[0]}
              help={chosenCategory && !chosenCategory.isPublished ? "This category is hidden, so the item cannot be published until the category is." : undefined}
              onChange={(event) => set("categoryId", event.target.value)}
            />
            <Select
              label="Food type"
              disabled={readOnly}
              value={form.dietaryType}
              options={DIETARY_OPTIONS}
              emptyOption="Not marked"
              error={fieldErrors.dietaryType?.[0]}
              help="Shown on the public menu as the standard veg / non-veg marking."
              onChange={(event) => set("dietaryType", event.target.value)}
            />
            <TextField
              label="Image link"
              type="url"
              inputMode="url"
              maxLength={2048}
              autoComplete="off"
              disabled={readOnly}
              value={form.imageUrl}
              placeholder="https://"
              error={fieldErrors.imageUrl?.[0]}
              help="An https link on a host your platform administrator allows. Leave it blank to use the icon below."
              onChange={(event) => set("imageUrl", event.target.value)}
            />
            <IconPicker name="iconKey" label="Icon" disabled={readOnly} value={form.iconKey} onValueChange={(value) => set("iconKey", value)} help="Used when there is no picture." />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing and tax</CardTitle>
            <CardDescription>Amounts are kept exactly as typed. Orders take their own copy of the price and tax rate, so past bills never change.</CardDescription>
          </CardHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MoneyField
              name="basePrice"
              label="Base price"
              required
              currencyCode={currencyCode}
              disabled={readOnly}
              defaultValue={item?.basePrice ?? ""}
              error={fieldErrors.basePrice?.[0]}
              onValueChange={setBasePrice}
              help="An item needs a price above zero, or an available variant, before it can be published."
            />
            <PercentField
              name="taxRate"
              label="Tax rate"
              required
              disabled={readOnly}
              defaultValue={item?.taxRate ?? ""}
              error={fieldErrors.taxRate?.[0]}
              onValueChange={setTaxRate}
              help="Applied per line when an order is priced."
            />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Variants</CardTitle>
            <CardDescription>Sizes or portions a guest chooses between, each with its own price. One can be the default.</CardDescription>
          </CardHeader>
          <OptionEditor kind="variant" rows={variants} onChange={setVariants} currencyCode={currencyCode} max={VARIANT_LIMIT} disabled={readOnly} fieldErrors={fieldErrors} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add-ons</CardTitle>
            <CardDescription>Extras a guest can add to this item, charged on top of the chosen price.</CardDescription>
          </CardHeader>
          <OptionEditor kind="addon" rows={addons} onChange={setAddons} currencyCode={currencyCode} max={ADDON_LIMIT} disabled={readOnly} fieldErrors={fieldErrors} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kitchen and preparation</CardTitle>
            <CardDescription>Where the ticket prints and how long the dish usually takes.</CardDescription>
          </CardHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Kitchen section"
              disabled={readOnly}
              value={form.kitchenSectionId}
              options={kitchenSections.map((section) => ({ value: section.id, label: `${section.name} (${section.code})` }))}
              emptyOption={kitchenSections.length === 0 ? "No kitchen sections yet" : "No section"}
              error={fieldErrors.kitchenSectionId?.[0]}
              onChange={(event) => set("kitchenSectionId", event.target.value)}
            />
            <TextField
              label="Preparation time"
              type="number"
              min={0}
              max={240}
              step={1}
              inputMode="numeric"
              disabled={readOnly}
              value={form.prepTimeMinutes}
              error={fieldErrors.prepTimeMinutes?.[0]}
              help="Minutes. The kitchen board uses it to flag overdue tickets."
              onChange={(event) => set("prepTimeMinutes", event.target.value)}
            />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visibility</CardTitle>
            <CardDescription>
              {saved
                ? "Publishing needs a published category and a sellable price. Availability is the sold-out switch your floor staff use."
                : "New items start hidden and available. Publish once the price and category are right."}
            </CardDescription>
          </CardHeader>
          {saved ? (
            <div className="flex flex-col gap-2">
              <Switch label="Published on your website" checked={saved.isPublished} disabled={readOnly} onChange={(event) => void toggle("published", event.target.checked)} />
              <Switch label="Available to order today" checked={saved.isAvailable} disabled={readOnly} onChange={(event) => void toggle("available", event.target.checked)} />
            </div>
          ) : (
            <p className="text-body text-fg-secondary">These switches appear once the item exists.</p>
          )}
        </Card>

        {canManage && (
          <div className="sticky bottom-4 flex flex-col-reverse gap-2 rounded-2xl border border-border-subtle bg-card p-4 shadow-e2 sm:flex-row sm:items-center sm:justify-end">
            <p aria-live="polite" className="mr-auto text-caption text-fg-secondary">
              {pending ? "Saving…" : dirty ? "Unsaved changes" : everSaved ? "Saved" : ""}
            </p>
            <Link
              href="/restaurant/menu/items"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border-strong bg-raised px-4 text-label text-fg-primary transition-colors duration-fast ease-standard hover:bg-border-subtle"
            >
              {dirty ? "Discard and go back" : "Back to items"}
            </Link>
            <Button icon={Save} loading={pending} onClick={() => void save()}>
              {saved ? "Save changes" : "Create item"}
            </Button>
          </div>
        )}
      </div>

      <div className="min-w-0 lg:col-span-1">
        <div className="lg:sticky lg:top-24">
          <PublicItemPreview
            name={form.name}
            description={form.description}
            imageUrl={form.imageUrl.trim() === "" ? null : form.imageUrl.trim()}
            iconKey={form.iconKey === "" ? null : form.iconKey}
            basePrice={basePrice}
            dietaryType={form.dietaryType === "" ? null : (form.dietaryType as DietaryType)}
            variants={variants}
            addons={addons}
            isAvailable={saved?.isAvailable ?? true}
            isPublished={saved?.isPublished ?? false}
            currencyCode={currencyCode}
          />
          {readOnly && (
            <Alert tone="neutral" className="mt-3" title="Read-only">
              Your role can see the menu but not change it.
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
