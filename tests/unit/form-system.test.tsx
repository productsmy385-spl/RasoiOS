import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ActionResult } from "@/lib/http/action";
import { acceptKeystroke, isPartialMoney, moneyDifference, normalizeMoney, normalizePercent } from "@/lib/ui/decimal-input";
import { currencySymbol } from "@/lib/ui/format";
import { ErrorSummary, Form, FormField, SubmitButton, summaryItems } from "@/components/ui/form";
import { FormContext, type FormContextValue } from "@/components/ui/form/form-context";
import { Checkbox, MoneyField, PercentField, RadioGroup, Select, SearchField, Switch, TextArea, TextField, TextInput } from "@/components/ui/inputs";
import { Input } from "@/components/ui/input";

// TC-DS-010 — form system (S1-P08-T005): money stays a decimal string, errors are wired with aria-describedby, and the
// error summary is the focus target after a failed submit. (The focus move itself runs in a browser: see
// tests/e2e/design-system.spec.ts "TC-DS-010 focus".)
const html = (node: React.ReactElement) => renderToStaticMarkup(node);

/** The value of the attribute on the element whose id is `id`. */
function attrOf(markup: string, selector: RegExp): string | undefined {
  return selector.exec(markup)?.[1];
}

function withFailedResult(result: ActionResult<unknown>, node: React.ReactNode, fields: FormContextValue["fields"] = {}) {
  const context: FormContextValue = { formId: "fTest", result, pending: false, fields, registerField: () => () => {} };
  return <FormContext.Provider value={context}>{node}</FormContext.Provider>;
}

const failed: ActionResult<unknown> = {
  ok: false,
  error: { code: "VALIDATION_ERROR", message: "Check the highlighted fields.", fieldErrors: { name: ["Enter a name"], basePrice: ["Enter an amount like 120 or 120.50"] }, requestId: "req-1" },
};

describe("TC-DS-010 money and percent entry stay decimal strings", () => {
  it("MoneyField normalises to a two-decimal string", () => {
    expect(normalizeMoney("480.5")).toBe("480.50");
    expect(normalizeMoney("480.50")).toBe("480.50");
    expect(normalizeMoney("480")).toBe("480.00");
    expect(normalizeMoney("0480.5")).toBe("480.50");
    expect(normalizeMoney(".5")).toBe("0.50");
    expect(normalizeMoney(" 12 ")).toBe("12.00");
    expect(typeof normalizeMoney("480.5")).toBe("string");
  });

  it("works out a cash difference in paisa, never in floating point (S1-P18-T007)", () => {
    expect(moneyDifference("1000.00", "1000.00")).toBe("0.00");
    expect(moneyDifference("1010.15", "1000.00")).toBe("10.15");
    expect(moneyDifference("990.00", "1000.00")).toBe("-10.00");
    expect(moneyDifference("0.05", "0.10")).toBe("-0.05");
    // The case that a float gets wrong: 0.1 + 0.2 − 0.3 is not zero in binary, but it is in paisa.
    expect(moneyDifference("0.30", "0.30")).toBe("0.00");
    expect(moneyDifference("4053.35", "4053.30")).toBe("0.05");
    // A trailing point is still an amount ("12." is 12.00, as the field itself normalises it).
    expect(moneyDifference("12.", "10.00")).toBe("2.00");
    // Anything that is not an amount has no difference to report.
    for (const bad of ["", "abc", "-5", "1e3", "1,200"]) expect(moneyDifference(bad, "10.00"), bad).toBeNull();
  });

  it("rejects exponent, sign, grouping and malformed entries", () => {
    for (const bad of ["1e3", "1E3", "-5", "+5", "1,200", "12.345", "abc", ".", "", "12345678901"]) {
      expect(normalizeMoney(bad), bad).toBeNull();
    }
    expect(isPartialMoney("1e3")).toBe(false);
    expect(isPartialMoney("480.")).toBe(true);
    // A keystroke that would make "1e3" is ignored; the previous text stays.
    expect(acceptKeystroke("1", "1e", "money")).toBe("1");
    expect(acceptKeystroke("480", "480.5", "money")).toBe("480.5");
  });

  it("PercentField accepts 0–100 with up to two decimals", () => {
    expect(normalizePercent("5")).toBe("5.00");
    expect(normalizePercent("18.5")).toBe("18.50");
    expect(normalizePercent("100")).toBe("100.00");
    expect(normalizePercent("100.01")).toBeNull();
    expect(normalizePercent("101")).toBeNull();
    expect(normalizePercent("1e2")).toBeNull();
  });

  it("MoneyField renders an inputmode=decimal text input with the currency prefix and submits the canonical string", () => {
    const out = html(<MoneyField name="basePrice" label="Price" currencyCode="INR" locale="en-IN" defaultValue="480.5" />);
    expect(out).toContain('inputMode="decimal"');
    expect(out).toContain('type="text"');
    expect(out).not.toContain('type="number"');
    expect(out).toContain(currencySymbol("INR", "en-IN"));
    expect(out).toMatch(/<input type="hidden" name="basePrice" value="480.50"\/>/);
    expect(out).toContain("Amount in INR");
  });

  it("an invalid initial value is submitted as typed so the server rejects it (never coerced)", () => {
    const out = html(<MoneyField name="basePrice" label="Price" currencyCode="INR" defaultValue="1e3" />);
    expect(out).toMatch(/<input type="hidden" name="basePrice" value="1e3"\/>/);
  });

  it("PercentField shows a % suffix", () => {
    const out = html(<PercentField name="taxRate" label="Tax rate" defaultValue="5" />);
    expect(out).toContain("%");
    expect(out).toMatch(/name="taxRate" value="5.00"/);
  });
});

describe("TC-DS-010 labels and error wiring", () => {
  it("every field has a visible label bound to its control", () => {
    const out = html(<TextField name="name" label="Item name" placeholder="e.g. Paneer tikka" />);
    // `[^>]*id="` would also match the tail of `aria-invalid="…"`, so require the attribute boundary.
    const id = attrOf(out, /<input[^>]*?\sid="([^"]+)"/);
    expect(id).toBeTruthy();
    expect(out).toContain(`for="${id}"`);
    expect(out).toContain(">Item name<");
  });

  it("required fields show * and aria-required", () => {
    const out = html(<TextField name="name" label="Item name" required />);
    expect(out).toContain("aria-required=\"true\"");
    expect(out).toMatch(/<span aria-hidden="true"[^>]*> \*<\/span>/);
  });

  it("help and client errors are linked with aria-describedby and aria-invalid", () => {
    const out = html(<TextField name="email" label="Email" help="We send the sign-in code here." error="Enter a valid email address" />);
    const describedBy = attrOf(out, /<input[^>]*aria-describedby="([^"]+)"/)!.split(" ");
    expect(describedBy).toHaveLength(2);
    for (const id of describedBy) expect(out).toContain(`id="${id}"`);
    expect(out).toContain('aria-invalid="true"');
    expect(out).toMatch(/Enter a valid email address/);
  });

  it("server field errors from the ActionResult land on the field with the same name", () => {
    const out = html(withFailedResult(failed, <TextField name="name" label="Name" />));
    const describedBy = attrOf(out, /<input[^>]*aria-describedby="([^"]+)"/);
    expect(describedBy).toBeTruthy();
    expect(out).toMatch(new RegExp(`id="${describedBy}"[^>]*>.*Enter a name`));
    expect(out).toContain('aria-invalid="true"');
    // Inside a form, ids derive from the form and the field name, so the summary can link to them.
    expect(out).toContain('id="ffTest-name"');
  });

  it("every input type follows the same wiring", () => {
    const controls = [
      <TextArea key="a" name="note" label="Note" error="Too long" />,
      <Select key="b" name="role" label="Role" error="Choose a role" options={[{ value: "WAITER", label: "Waiter" }]} emptyOption="Choose a role" />,
      <SearchField key="c" name="q" label="Search orders" error="Too long" />,
      <MoneyField key="d" name="amount" label="Amount" currencyCode="INR" error="Enter an amount" />,
    ];
    for (const control of controls) {
      const out = html(control);
      const describedBy = attrOf(out, /aria-describedby="([^"]+)"/);
      expect(describedBy, out).toBeTruthy();
      expect(out).toContain('aria-invalid="true"');
    }
    const checkbox = html(<Checkbox name="autoPrint" label="Print kitchen tickets automatically" error="Required" />);
    expect(checkbox).toMatch(/type="checkbox"[^>]*aria-describedby="[^"]+"/);
    const radio = html(<RadioGroup name="orderType" label="Order type" options={[{ value: "DINE_IN", label: "Dine-in" }]} error="Choose one" />);
    expect(radio).toContain("<legend");
    expect(radio).toMatch(/role="radiogroup"[^>]*aria-describedby="[^"]+"/);
    const toggle = html(<Switch name="published" label="Published" />);
    expect(toggle).toContain('role="switch"');
  });

  it("controls are 40 px (md) or 48 px (touch) tall", () => {
    expect(html(<TextField name="a" label="A" />)).toContain("h-10");
    expect(html(<TextField name="a" label="A" size="touch" />)).toContain("h-12");
    expect(html(<FormField label="Custom"><TextInput /></FormField>)).toContain("h-10");
  });

  it("the legacy Input binds its label and error", () => {
    const out = html(<Input label="Contact phone" error="Use international format" />);
    // `[^>]*id="` would also match the tail of `aria-invalid="…"`, so require the attribute boundary.
    const id = attrOf(out, /<input[^>]*?\sid="([^"]+)"/);
    expect(out).toContain(`for="${id}"`);
    expect(out).toContain(`aria-describedby="${id}-error"`);
  });
});

describe("TC-DS-010 error summary", () => {
  it("is focusable, announced, and links each field error to its control", () => {
    const items = summaryItems(failed, { name: { id: "ffTest-name", label: "Name" } });
    const out = html(<ErrorSummary title="Check the highlighted fields." items={items} />);
    expect(out).toContain('tabindex="-1"');
    expect(out).toContain('role="alert"');
    expect(out).toContain('href="#ffTest-name"');
    expect(out).toContain("Name: Enter a name");
    // A field without a registered control still gets a readable label.
    expect(out).toContain("Base price: Enter an amount like 120 or 120.50");
  });

  it("the form renders no summary before the first submit and a pending-aware submit button", () => {
    const out = html(
      <Form action={async () => ({ ok: true, data: null })}>
        <TextField name="name" label="Name" />
        <SubmitButton>Save</SubmitButton>
      </Form>,
    );
    expect(out).not.toContain("data-error-summary");
    expect(out).toContain('type="submit"');
    // React 19 serialises the DOM property name (`noValidate=""`), which the browser reads as `novalidate`.
    expect(out.toLowerCase()).toContain("novalidate");
  });
});
