/**
 * Specs for the Jikan client limit clamping (FASE 2.2-F.2).
 *
 * Jikan's `/top/anime` endpoint caps `limit` at 25 and returns HTTP 400 for
 * anything larger — this is the root cause of the recommendation 500. These
 * tests pin the clamp so no consumer can ever send `limit > 25` again.
 *
 * `fetch` is stubbed, so no real network calls are made.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { jikanClient } from "./jikan.service";

function stubFetch() {
  const fetchSpy = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ data: [] }),
  }));
  vi.stubGlobal("fetch", fetchSpy);
  return fetchSpy;
}

describe("jikanClient — limit clamping", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("getPool(30) never requests limit > 25", async () => {
    const fetchSpy = stubFetch();

    await jikanClient.getPool(30);

    const urls = fetchSpy.mock.calls.map((c) => String(c[0]));
    expect(urls).toHaveLength(2);
    for (const url of urls) {
      expect(url).toContain("limit=25");
      expect(url).not.toContain("limit=30");
    }
  });

  it("getTrending clamps an oversized limit to 25", async () => {
    const fetchSpy = stubFetch();

    await jikanClient.getTrending(50);

    expect(String(fetchSpy.mock.calls[0][0])).toContain("limit=25");
  });

  it("getPopular clamps an oversized limit to 25", async () => {
    const fetchSpy = stubFetch();

    await jikanClient.getPopular(99);

    expect(String(fetchSpy.mock.calls[0][0])).toContain("limit=25");
  });

  it("search clamps an oversized limit to 25", async () => {
    const fetchSpy = stubFetch();

    await jikanClient.search("naruto", 100);

    expect(String(fetchSpy.mock.calls[0][0])).toContain("limit=25");
  });

  it("preserves a within-range limit unchanged", async () => {
    const fetchSpy = stubFetch();

    await jikanClient.getTrending(18);

    expect(String(fetchSpy.mock.calls[0][0])).toContain("limit=18");
  });
});
