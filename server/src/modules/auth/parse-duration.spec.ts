/**
 * Specs for parseDuration (FASE 2.2-I.3 — JWT refresh TTL fix).
 *
 * The refresh token expiry is derived from JWT_REFRESH_TTL via parseDuration.
 * These guard the corrected "7d" value and document that the previous "7d1"
 * typo silently fell back to the 7-day default (never a zero/NaN lifetime).
 */

import { describe, expect, it } from "vitest";
import { parseDuration } from "./auth.service";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("parseDuration", () => {
  it("parses the corrected refresh TTL (7d) to 7 days", () => {
    expect(parseDuration("7d")).toBe(7 * DAY);
  });

  it("parses seconds, minutes and hours", () => {
    expect(parseDuration("900s")).toBe(900 * SECOND);
    expect(parseDuration("30m")).toBe(30 * MINUTE);
    expect(parseDuration("1h")).toBe(HOUR);
  });

  it("falls back to 7 days for the malformed '7d1' typo", () => {
    expect(parseDuration("7d1")).toBe(7 * DAY);
  });

  it("falls back to 7 days for other malformed values", () => {
    expect(parseDuration("")).toBe(7 * DAY);
    expect(parseDuration("abc")).toBe(7 * DAY);
    expect(parseDuration("7")).toBe(7 * DAY);
  });

  it("never yields a zero or NaN lifetime", () => {
    for (const raw of ["7d", "900s", "7d1", "", "garbage"]) {
      const ms = parseDuration(raw);
      expect(ms).toBeGreaterThan(0);
      expect(Number.isNaN(ms)).toBe(false);
    }
  });
});
