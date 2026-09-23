import { afterEach, describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";
import { updateBrandingSchema } from "@/lib/validation/settings";
import {
  allowedImageHosts,
  checkImageUrl,
  imageRemotePatterns,
  imageUrl,
  imageUrlOrBlank,
  parseImageHostList,
} from "@/lib/validation/url";

// TC-SEC-003 — image URLs cannot be used for SSRF, tracking hosts or mixed content (S1-P07-T002, SC-VAL-04, ADV-017).
const ALLOWED = ["allowed.test", "images.example.com"];
const original = process.env.ALLOWED_IMAGE_HOSTS;
afterEach(() => {
  if (original === undefined) delete process.env.ALLOWED_IMAGE_HOSTS;
  else process.env.ALLOWED_IMAGE_HOSTS = original;
});

describe("TC-SEC-003 checkImageUrl", () => {
  it("rejects every case named in the test plan", () => {
    const cases: Array<[string, string]> = [
      ["http://allowed.test/logo.png", "NOT_HTTPS"],
      ["https://169.254.169.254/latest/meta-data/", "IP_LITERAL"],
      ["https://user:pass@allowed.test/logo.png", "CREDENTIALS"],
      ["https://evil.test/logo.png", "HOST_NOT_ALLOWED"],
      ["https://allowed.test:8443/logo.png", "PORT"],
    ];
    for (const [url, problem] of cases) {
      expect(checkImageUrl(url, ALLOWED), url).toMatchObject({ ok: false, problem });
    }
  });

  it("accepts allowlisted hosts over https and returns the normalised URL", () => {
    expect(checkImageUrl("https://allowed.test/menu/paneer.jpg", ALLOWED)).toEqual({ ok: true, url: "https://allowed.test/menu/paneer.jpg" });
    expect(checkImageUrl("https://IMAGES.Example.com/a.png?w=800", ALLOWED)).toEqual({ ok: true, url: "https://images.example.com/a.png?w=800" });
    // The default https port is not a "non-default port".
    expect(checkImageUrl("https://allowed.test:443/a.png", ALLOWED)).toEqual({ ok: true, url: "https://allowed.test/a.png" });
  });

  it("rejects other schemes, IP spellings, internal names and look-alike hosts", () => {
    const rejected: Array<[string, string]> = [
      ["javascript:alert(1)", "NOT_HTTPS"],
      ["data:image/png;base64,iVBORw0KGgo=", "NOT_HTTPS"],
      ["ftp://allowed.test/a.png", "NOT_HTTPS"],
      ["//allowed.test/a.png", "INVALID"],
      ["https://2852039166/", "IP_LITERAL"], // 169.254.169.254 as one decimal number
      ["https://0xa9.0xfe.0xa9.0xfe/", "IP_LITERAL"],
      ["https://[::1]/a.png", "IP_LITERAL"],
      ["https://127.0.0.1/a.png", "IP_LITERAL"],
      ["https://localhost/a.png", "HOST_NOT_ALLOWED"],
      ["https://allowed.test.evil.test/a.png", "HOST_NOT_ALLOWED"],
      ["https://evilallowed.test/a.png", "HOST_NOT_ALLOWED"],
      ["https://sub.allowed.test/a.png", "HOST_NOT_ALLOWED"],
      ["https://@allowed.test/a.png", "CREDENTIALS"],
      ["https://user@allowed.test/a.png", "CREDENTIALS"],
      ["https://allowed.test/a b.png", "INVALID"],
      ["https://allo\nwed.test/a.png", "INVALID"],
      ["not a url", "INVALID"],
    ];
    for (const [url, problem] of rejected) {
      expect(checkImageUrl(url, ALLOWED), url).toMatchObject({ ok: false, problem });
    }
  });

  it("limits the length to 2048 characters", () => {
    const base = "https://allowed.test/";
    expect(checkImageUrl(base + "a".repeat(2048 - base.length), ALLOWED).ok).toBe(true);
    expect(checkImageUrl(base + "a".repeat(2049 - base.length), ALLOWED)).toMatchObject({ ok: false, problem: "TOO_LONG" });
  });

  it("accepts nothing when the allowlist is empty", () => {
    expect(checkImageUrl("https://allowed.test/a.png", [])).toMatchObject({ ok: false, problem: "HOST_NOT_ALLOWED" });
  });
});

describe("ALLOWED_IMAGE_HOSTS", () => {
  it("parses a comma-separated hostname list (trimmed, lowercased, de-duplicated)", () => {
    expect(parseImageHostList(" Images.Example.com , cdn.test.org,images.example.com ")).toEqual(["images.example.com", "cdn.test.org"]);
    expect(parseImageHostList("")).toEqual([]);
    expect(parseImageHostList(undefined)).toEqual([]);
  });

  it("refuses schemes, ports, paths, wildcards, IPs, single labels and empty entries", () => {
    for (const bad of ["https://images.test", "images.test:443", "images.test/path", "*.images.test", "10.0.0.1", "localhost", "a.test,,b.test", "not a host"]) {
      expect(parseImageHostList(bad), bad).toBeNull();
    }
  });

  it("is validated at boot by lib/env.ts with the same rules", () => {
    const valid = {
      DATABASE_URL: "postgresql://u:p@localhost:5432/db",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_abcdefghijklmnop",
      CLERK_SECRET_KEY: "sk_test_abcdefghijklmnop",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    };
    expect(parseEnv({ ...valid, ALLOWED_IMAGE_HOSTS: "images.unsplash.com,cdn.test.org" }).ALLOWED_IMAGE_HOSTS).toBe("images.unsplash.com,cdn.test.org");
    expect(() => parseEnv({ ...valid, ALLOWED_IMAGE_HOSTS: "*.unsplash.com" })).toThrow(/ALLOWED_IMAGE_HOSTS: must be a comma-separated list of hostnames/);
  });

  it("the validators read the configured value on every call and fail closed when it is malformed", () => {
    process.env.ALLOWED_IMAGE_HOSTS = "allowed.test";
    expect(allowedImageHosts()).toEqual(["allowed.test"]);
    expect(imageUrl().safeParse("https://allowed.test/a.png")).toMatchObject({ success: true, data: "https://allowed.test/a.png" });
    process.env.ALLOWED_IMAGE_HOSTS = "http://allowed.test";
    expect(allowedImageHosts()).toEqual([]);
    expect(imageUrl().safeParse("https://allowed.test/a.png").success).toBe(false);
  });

  it("next.config.ts remotePatterns come from the same list", () => {
    expect(imageRemotePatterns(["allowed.test"])).toEqual([{ protocol: "https", hostname: "allowed.test", port: "", pathname: "/**" }]);
  });
});

describe("schema fields using the allowlist (SA-RST-02; SA-MENU-06/07 use imageUrlOrBlank)", () => {
  it("branding rejects non-allowlisted logo and cover hosts with field errors", () => {
    process.env.ALLOWED_IMAGE_HOSTS = "allowed.test";
    const bad = updateBrandingSchema.safeParse({ logoUrl: "https://evil.test/logo.png", coverImageUrl: "http://allowed.test/c.png" });
    expect(bad.success).toBe(false);
    const paths = bad.success ? [] : bad.error.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["logoUrl", "coverImageUrl"]));
    expect(updateBrandingSchema.parse({ logoUrl: "https://allowed.test/logo.png", coverImageUrl: "" })).toEqual({
      logoUrl: "https://allowed.test/logo.png",
      coverImageUrl: null,
    });
  });

  it("imageUrlOrBlank (menu item images) maps blank to null and checks everything else", () => {
    const field = imageUrlOrBlank("Image link", () => ALLOWED);
    expect(field.parse("   ")).toBeNull();
    expect(field.parse(" https://allowed.test/p.jpg ")).toBe("https://allowed.test/p.jpg");
    const rejected = field.safeParse("https://169.254.169.254/");
    expect(rejected.success).toBe(false);
    expect(rejected.success ? "" : rejected.error.issues[0].message).toBe("Image link: Use the image host's name, not an IP address");
  });
});
