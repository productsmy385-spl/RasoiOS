"use client";

import { channels } from "@/components/public/theme";
import { contrastRatio } from "@/lib/ui/contrast";
import { MIN_THEME_CONTRAST, type WebsiteSurfaceModeName, type WebsiteThemePresetName } from "@/lib/validation/website";

/**
 * Live preview of the restaurant's public website (S1-P07-T011).
 *
 * It paints the *draft* palette — the colours currently in the form — using the same CSS custom properties the real
 * page sets, so what is shown here is what the site will look like. The server is still the authority: it re-resolves
 * and re-checks the palette on save and rejects anything that fails WCAG, which is why the readout below reports the
 * measured ratio for each colour before the restaurant presses Save.
 *
 * The preview never claims a change is live. It is a preview until the server confirms the save.
 */

export type PreviewPalette = { primary: string; secondary: string; accent: string; gradientFrom: string; gradientTo: string };

const BLACK = "#0B0B0F";
const WHITE = "#FFFFFF";

/** Black or white — whichever is more readable on `hex` (the same rule as `onColourFor` on the server). */
function onColour(hex: string): string {
  return contrastRatio(hex, WHITE) >= contrastRatio(hex, BLACK) ? WHITE : BLACK;
}

function onGradient(from: string, to: string): string {
  const white = Math.min(contrastRatio(from, WHITE), contrastRatio(to, WHITE));
  const black = Math.min(contrastRatio(from, BLACK), contrastRatio(to, BLACK));
  return white >= black ? WHITE : BLACK;
}

export type PreviewInput = {
  preset: WebsiteThemePresetName;
  surfaceMode: WebsiteSurfaceModeName;
  palette: PreviewPalette;
  surfaceHex: string;
  onSurfaceHex: string;
  restaurantName: string;
  headline: string;
  tagline: string | null;
  ctaLabel: string | null;
  sectionLabels: string[];
};

/** Per-colour contrast against the chosen website background — the check the server will apply on save. */
export function contrastReadout(palette: PreviewPalette, surfaceHex: string): Array<{ label: string; ratio: number; ok: boolean }> {
  return (
    [
      ["Primary", palette.primary],
      ["Secondary", palette.secondary],
      ["Accent", palette.accent],
    ] as const
  ).map(([label, hex]) => {
    const ratio = contrastRatio(hex, surfaceHex);
    return { label, ratio, ok: ratio >= MIN_THEME_CONTRAST };
  });
}

export function SitePreview({ input, dirty }: { input: PreviewInput; dirty: boolean }) {
  const { palette, surfaceHex, onSurfaceHex } = input;
  const readout = contrastReadout(palette, surfaceHex);

  return (
    <aside aria-label="Website preview" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-label text-fg-primary">Preview</h2>
        <span className="text-caption text-fg-secondary">{dirty ? "Unsaved changes" : "Matches the published site"}</span>
      </div>

      <div
        data-theme={input.surfaceMode === "LIGHT" ? "light" : "dark"}
        data-preview-preset={input.preset}
        style={
          {
            "--surface": channels(surfaceHex),
            "--text": channels(onSurfaceHex),
            "--text-accent": channels(palette.primary),
            "--primary": channels(palette.primary),
            "--on-primary": channels(onColour(palette.primary)),
            "--secondary": channels(palette.secondary),
            "--accent": channels(palette.accent),
          } as React.CSSProperties
        }
        className="overflow-hidden rounded-2xl border border-border-subtle bg-canvas text-fg-primary"
      >
        <div
          className="flex flex-col gap-2 p-5"
          style={{
            backgroundImage: `linear-gradient(135deg, ${palette.gradientFrom} 0%, ${palette.gradientTo} 100%)`,
            color: onGradient(palette.gradientFrom, palette.gradientTo),
          }}
        >
          <p className="text-caption opacity-80">{input.restaurantName}</p>
          <p className="font-display text-display-m">{input.headline}</p>
          {input.tagline ? <p className="text-body opacity-90">{input.tagline}</p> : null}
          {input.ctaLabel ? (
            <span
              className="mt-2 inline-flex h-10 w-fit items-center rounded-xl px-4 text-label"
              style={{ backgroundColor: palette.primary, color: onColour(palette.primary) }}
            >
              {input.ctaLabel}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap gap-2">
            {input.sectionLabels.map((label) => (
              <span key={label} className="inline-flex h-6 items-center rounded-full bg-action-primary/12 px-2.5 text-caption text-fg-accent">
                {label}
              </span>
            ))}
          </div>
          <p className="text-body text-fg-secondary">Body text on this restaurant&apos;s website background.</p>
          <p className="text-body text-fg-accent">A link or price in the primary colour.</p>
        </div>
      </div>

      <dl className="flex flex-col gap-1 rounded-xl border border-border-subtle bg-card p-4">
        {readout.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-caption">
            <dt className="text-fg-secondary">{row.label} on the website background</dt>
            <dd className={row.ok ? "text-status-success tabular-nums" : "text-status-danger tabular-nums"}>
              {row.ratio.toFixed(2)}:1 {row.ok ? "passes" : `needs ${MIN_THEME_CONTRAST}:1`}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
