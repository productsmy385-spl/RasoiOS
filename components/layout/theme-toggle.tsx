"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { getThemePreferenceAction, setThemePreferenceAction } from "@/app/account/theme-actions";
import { Icon } from "@/components/ui/icon";
import { Menu } from "@/components/ui/menu";
import {
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
  resolveThemePreference,
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  type ThemePreferenceValue,
} from "@/lib/ui/theme";

/**
 * The console's one theme control (RASOIOS-ADR-016), rendered next to the account menu in every console header.
 * Light / Dark / System. Applying is instant (attributes on <html>, the same ones the pre-paint boot script sets);
 * the choice is then saved to the person's account so it follows them to other devices. Only the platform theme
 * changes — restaurant websites keep their own theme on their own page wrapper.
 */
const OPTIONS: ReadonlyArray<{ value: ThemePreferenceValue; label: string; icon: typeof Sun }> = [
  { value: "LIGHT", label: "Light", icon: Sun },
  { value: "DARK", label: "Dark", icon: Moon },
  { value: "SYSTEM", label: "System", icon: Monitor },
];

function systemPrefersDark(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
}

export function applyTheme(preference: ThemePreferenceValue): void {
  const dark = resolveThemePreference(preference, systemPrefersDark()) === "dark";
  const root = document.documentElement;
  root.setAttribute("data-theme", dark ? "dark" : "light");
  root.setAttribute("data-theme-preference", preference);
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

function cookiePreference(): ThemePreferenceValue | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([A-Z]+)`));
  return match && isThemePreference(match[1]) ? match[1] : null;
}

export function ThemeToggle() {
  const [preference, setPreference] = React.useState<ThemePreferenceValue>(DEFAULT_THEME_PREFERENCE);

  React.useEffect(() => {
    const fromCookie = cookiePreference();
    if (fromCookie) {
      setPreference(fromCookie);
      return;
    }
    // A browser that has never stored a choice (new device): load the one saved on the account.
    let cancelled = false;
    void getThemePreferenceAction().then((result) => {
      if (cancelled || !result.ok) return;
      setPreference(result.data.preference);
      applyTheme(result.data.preference);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // SYSTEM follows the operating system live.
  React.useEffect(() => {
    if (preference !== "SYSTEM" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("SYSTEM");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [preference]);

  function choose(next: ThemePreferenceValue) {
    setPreference(next);
    applyTheme(next);
    // Written locally first so a reload keeps the choice even if saving to the account fails.
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`;
    void setThemePreferenceAction({ preference: next });
  }

  const current = OPTIONS.find((option) => option.value === preference) ?? OPTIONS[1];

  return (
    <Menu
      items={OPTIONS.map((option) => ({ label: option.label, icon: option.icon, checked: option.value === preference, onSelect: () => choose(option.value) }))}
      trigger={(props) => (
        <button
          {...props}
          aria-label={`Theme: ${current.label}. Change theme`}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-fg-secondary transition-colors duration-fast ease-standard hover:bg-raised hover:text-fg-primary"
        >
          <Icon icon={current.icon} size={20} />
        </button>
      )}
    />
  );
}
