import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteImage } from "@/components/public/primitives";
import { EnvValidationError, parseEnv } from "@/lib/env";
import { EXTENSION_FOR, sniffImageType } from "@/lib/media/image-file";
import { imageKitUrlEndpoint } from "@/lib/media/imagekit";
import { MEDIA_PURPOSES, imageKitSized, imageKitSrcSet, isImageKitUrl, mediaFolder, permissionForPurpose, safeOriginalName } from "@/lib/media/purposes";
import { allowedImageHosts, imageKitHost } from "@/lib/validation/url";

// S1-P07-T009 / RASOIOS-ADR-017 — the pure parts of image uploads: file sniffing, folders, ImageKit URL sizing,
// configuration and the public <img> markup. The upload flow itself is covered in tests/integration/media.

const TENANT = "0f8d2c1e-3b4a-4c5d-8e9f-a0b1c2d3e4f5";
const IK = "https://ik.imagekit.io/rasoios_test";

afterEach(() => vi.unstubAllEnvs());

describe("sniffImageType (SC-FILE-01: type from bytes, never from the browser)", () => {
  it("recognises JPEG, PNG and WebP by their magic numbers", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe("image/jpeg");
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("image/png");
    expect(sniffImageType(new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]))).toBe("image/webp");
  });

  it("rejects SVG, GIF, HTML, executables and truncated headers", () => {
    for (const text of ["<svg xmlns='http://www.w3.org/2000/svg'/>", "GIF89a", "<!doctype html>", "MZ", "\u00ff\u00d8"]) {
      expect(sniffImageType(new Uint8Array(Buffer.from(text, "latin1"))), text).toBeNull();
    }
    expect(sniffImageType(new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WAVE")]))).toBeNull();
  });

  it("maps each type to one extension", () => {
    expect(EXTENSION_FOR).toEqual({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" });
  });
});

describe("mediaFolder (SC-FILE-02: server-built, tenant-scoped folders)", () => {
  it("puts every purpose under the tenant's own folder", () => {
    expect(MEDIA_PURPOSES.map((purpose) => mediaFolder(TENANT, purpose))).toEqual([
      `/rasoios/restaurants/${TENANT}/logo`,
      `/rasoios/restaurants/${TENANT}/cover`,
      `/rasoios/restaurants/${TENANT}/hero`,
      `/rasoios/restaurants/${TENANT}/favicon`,
      `/rasoios/restaurants/${TENANT}/website`,
      `/rasoios/restaurants/${TENANT}/menu`,
    ]);
  });

  it("refuses anything that is not a UUID, so no path can be smuggled in", () => {
    for (const bad of ["../other", "akshayapatra-devarapalli", `${TENANT}/../x`, ""]) {
      expect(() => mediaFolder(bad, "LOGO"), bad).toThrow();
    }
  });

  it("maps website images to website:update and menu images to menu:manage", () => {
    expect(permissionForPurpose("LOGO")).toBe("website:update");
    expect(permissionForPurpose("WEBSITE_SECTION")).toBe("website:update");
    expect(permissionForPurpose("MENU_ITEM")).toBe("menu:manage");
  });

  it("keeps only a display-safe original file name", () => {
    expect(safeOriginalName("C:\\Users\\me\\Pictures\\biryani.jpg")).toBe("biryani.jpg");
    expect(safeOriginalName("../../etc/passwd")).toBe("passwd");
    expect(safeOriginalName("a\u0000b\u0007.png")).toBe("ab.png");
    expect(safeOriginalName("x".repeat(300))).toHaveLength(120);
    expect(safeOriginalName("")).toBeNull();
    expect(safeOriginalName(undefined)).toBeNull();
  });
});

describe("ImageKit URL sizing (ADR-017 §6)", () => {
  const url = `${IK}/rasoios/restaurants/${TENANT}/menu/a.jpg`;

  it("adds a width/quality/format transformation to ImageKit URLs only", () => {
    expect(imageKitSized(url, 400)).toBe(`${url}?tr=w-400%2Cq-80%2Cf-auto`);
    expect(imageKitSized("https://images.example.com/a.jpg", 400)).toBe("https://images.example.com/a.jpg");
    expect(imageKitSized(url, 1_000_000)).toContain("w-4096");
    expect(isImageKitUrl("http://ik.imagekit.io/x/a.jpg")).toBe(false);
    expect(isImageKitUrl("https://ik.imagekit.io.evil.example/a.jpg")).toBe(false);
  });

  it("offers 1x and 2x candidates", () => {
    expect(imageKitSrcSet(url, 300)).toBe(`${imageKitSized(url, 300)} 1x, ${imageKitSized(url, 600)} 2x`);
    expect(imageKitSrcSet("https://images.example.com/a.jpg", 300)).toBeNull();
  });

  it("SiteImage renders a sized src and srcset for ImageKit images, and pasted links unchanged", () => {
    const uploaded = renderToStaticMarkup(<SiteImage src={url} alt="Biryani" displayWidth={400} />);
    expect(uploaded).toContain(`src="${imageKitSized(url, 400).replace(/&/g, "&amp;")}"`);
    expect(uploaded).toContain("srcSet=");
    expect(uploaded).toContain('loading="lazy"');

    const pasted = renderToStaticMarkup(<SiteImage src="https://images.example.com/a.jpg" alt="Hero" priority />);
    expect(pasted).toContain('src="https://images.example.com/a.jpg"');
    expect(pasted).not.toContain("srcSet=");
    expect(pasted).toContain('loading="eager"');
  });
});

describe("ImageKit configuration (ADR-017 §7)", () => {
  const base = {
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://app:pw@localhost:5432/rasoios?schema=public",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_Y2xlcmsuZGV2LmxvY2FsJA",
    CLERK_SECRET_KEY: "sk_test_abcdef0123456789",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  };
  const problemsOf = (env: Record<string, string | undefined>): string[] => {
    try {
      parseEnv(env);
      return [];
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      return (error as EnvValidationError).problems;
    }
  };

  it("accepts both settings, or neither, and treats blank as unset", () => {
    expect(problemsOf({ ...base, IMAGEKIT_PRIVATE_KEY: "private_abc123", IMAGEKIT_URL_ENDPOINT: IK })).toEqual([]);
    expect(problemsOf(base)).toEqual([]);
    expect(problemsOf({ ...base, IMAGEKIT_PRIVATE_KEY: "", IMAGEKIT_URL_ENDPOINT: "" })).toEqual([]);
  });

  it("rejects one without the other, a wrong key format, a non-https endpoint and a public private key — without echoing values", () => {
    expect(problemsOf({ ...base, IMAGEKIT_PRIVATE_KEY: "private_abc123" })).toEqual(["IMAGEKIT_URL_ENDPOINT: is required when the other ImageKit setting is set"]);
    expect(problemsOf({ ...base, IMAGEKIT_URL_ENDPOINT: IK })).toEqual(["IMAGEKIT_PRIVATE_KEY: is required when the other ImageKit setting is set"]);
    const wrong = problemsOf({ ...base, IMAGEKIT_PRIVATE_KEY: "public_abc123", IMAGEKIT_URL_ENDPOINT: "http://ik.imagekit.io/x" });
    expect(wrong).toEqual(expect.arrayContaining([expect.stringMatching(/^IMAGEKIT_PRIVATE_KEY: /), expect.stringMatching(/^IMAGEKIT_URL_ENDPOINT: /)]));
    expect(wrong.join(" ")).not.toContain("public_abc123");
    expect(problemsOf({ ...base, NEXT_PUBLIC_IMAGEKIT_PRIVATE_KEY: "private_abc123" })).toContain("NEXT_PUBLIC_IMAGEKIT_PRIVATE_KEY: server secret must not use the NEXT_PUBLIC_ prefix");
  });

  it("normalises the endpoint and allow-lists its host automatically", () => {
    expect(imageKitUrlEndpoint(`${IK}/`)).toBe(IK);
    expect(imageKitUrlEndpoint("http://ik.imagekit.io/x")).toBeNull();
    expect(imageKitHost(IK)).toBe("ik.imagekit.io");
    vi.stubEnv("ALLOWED_IMAGE_HOSTS", "images.example.com");
    vi.stubEnv("IMAGEKIT_URL_ENDPOINT", IK);
    expect(allowedImageHosts()).toEqual(["images.example.com", "ik.imagekit.io"]);
    vi.stubEnv("IMAGEKIT_URL_ENDPOINT", "");
    expect(allowedImageHosts()).toEqual(["images.example.com"]);
  });
});
