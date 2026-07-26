import { describe, expect, it, vi } from "vitest";
import { shieldApi } from "../services/api.js";

describe("shield API", () => {
  it("returns JSON on a successful response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { ok: true } }) });
    await expect(shieldApi.health()).resolves.toEqual({ success: true, data: { ok: true } });
    expect(fetch).toHaveBeenCalledWith("/__shield/health", expect.objectContaining({ headers: { "Content-Type": "application/json" }, signal: expect.any(AbortSignal) }));
  });

  it("normalizes server errors", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: { message: "unavailable" } }) });
    await expect(shieldApi.health()).rejects.toThrow("unavailable");
  });
});
