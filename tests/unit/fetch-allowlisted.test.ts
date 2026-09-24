import { afterEach, describe, expect, it, vi } from "vitest";
import { IMAGE_FETCH_MAX_BYTES, fetchAllowlistedImage } from "@/lib/media/fetch-allowlisted";

/**
 * TC-WEB-009 / SC-VAL-04 — the one place the server fetches an address that came from a tenant's own data
 * (S1-P09-T006). The spy is the point of these cases: for anything off the allowlist, `fetch` must never be called
 * at all, not merely have its result discarded.
 */
const HOSTS = ["images.example.com"];

function imageResponse(body: Uint8Array, contentType = "image/png", headers: Record<string, string> = {}): Response {
  return new Response(body.slice().buffer as ArrayBuffer, { status: 200, headers: { "content-type": contentType, ...headers } });
}

afterEach(() => vi.unstubAllGlobals());

/** Installs a spy as global fetch and returns it. */
function spyFetch(impl: (url: string) => Promise<Response> = async () => imageResponse(new Uint8Array([1, 2, 3]))) {
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    void init;
    return impl(String(input));
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

describe("TC-WEB-009 an image is fetched only from an allowlisted host", () => {
  it("never makes a request for a host that is not on the list", async () => {
    const spy = spyFetch();
    for (const url of [
      "https://evil.example.net/logo.png",
      "https://images.example.com.evil.net/logo.png",
      "http://images.example.com/logo.png",
      "https://user:pass@images.example.com/logo.png",
      "https://169.254.169.254/latest/meta-data",
      "https://images.example.com:8443/logo.png",
      "file:///etc/passwd",
    ]) {
      expect(await fetchAllowlistedImage(url, HOSTS), url).toBeNull();
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it("makes no request at all for a missing URL", async () => {
    const spy = spyFetch();
    expect(await fetchAllowlistedImage(null, HOSTS)).toBeNull();
    expect(await fetchAllowlistedImage("", HOSTS)).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("fetches an allowlisted image and refuses to follow a redirect off the list", async () => {
    const spy = spyFetch();
    const fetched = await fetchAllowlistedImage("https://images.example.com/logo.png", HOSTS);
    expect(fetched).toMatchObject({ contentType: "image/png" });
    expect(spy).toHaveBeenCalledTimes(1);
    // A followed redirect would land somewhere the allowlist never checked.
    expect(spy.mock.calls[0][1]).toMatchObject({ redirect: "error" });
  });
});

describe("TC-WEB-009 a hostile response cannot hurt the server", () => {
  it("discards a body over the cap even when the declared length lies", async () => {
    spyFetch(async () => imageResponse(new Uint8Array(IMAGE_FETCH_MAX_BYTES + 1024), "image/png", { "content-length": "10" }));
    expect(await fetchAllowlistedImage("https://images.example.com/huge.png", HOSTS)).toBeNull();
  });

  it("refuses a declared length over the cap without reading the body", async () => {
    spyFetch(async () => imageResponse(new Uint8Array([1]), "image/png", { "content-length": String(IMAGE_FETCH_MAX_BYTES + 1) }));
    expect(await fetchAllowlistedImage("https://images.example.com/huge.png", HOSTS)).toBeNull();
  });

  it("refuses anything that is not an image, so an error page never reaches the renderer", async () => {
    spyFetch(async () => imageResponse(new Uint8Array([1]), "text/html"));
    expect(await fetchAllowlistedImage("https://images.example.com/oops", HOSTS)).toBeNull();
  });

  it("returns null for a non-200 and for a host that refuses the connection", async () => {
    spyFetch(async () => new Response("nope", { status: 404 }));
    expect(await fetchAllowlistedImage("https://images.example.com/missing.png", HOSTS)).toBeNull();

    spyFetch(async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(await fetchAllowlistedImage("https://images.example.com/down.png", HOSTS)).toBeNull();
  });
});
