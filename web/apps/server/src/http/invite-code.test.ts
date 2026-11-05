import { describe, expect, it } from "vitest";

import { inviteCodeChecker } from "./invite-code";

describe("inviteCodeChecker", () => {
  it("disables signup when no code is configured", () => {
    for (const configured of [undefined, "", "   "]) {
      const check = inviteCodeChecker(configured);
      // Fail closed, including for the `SIGNUP_INVITE_CODE=` line somebody
      // leaves in a .env: that must not become a code the empty string matches.
      expect(check("")).toBe("disabled");
      expect(check("anything")).toBe("disabled");
    }
  });

  it("accepts the configured code and rejects everything else", () => {
    const check = inviteCodeChecker("staff-room-2026");

    expect(check("staff-room-2026")).toBe("accepted");
    expect(check("")).toBe("rejected");
    expect(check("staff-room-2025")).toBe("rejected");
    // A prefix is the case a length check would have answered early.
    expect(check("staff")).toBe("rejected");
    expect(check("staff-room-2026 ")).toBe("rejected");
    expect(check("STAFF-ROOM-2026")).toBe("rejected");
  });

  it("compares strings of any length without throwing", () => {
    const check = inviteCodeChecker("short");

    // `timingSafeEqual` throws on buffers of different lengths, so comparing
    // the raw strings would need the length checked first — which is itself a
    // leak, and a 500 on a long body if forgotten. Digesting both sides makes
    // every comparison the same fixed 32 bytes.
    expect(check("x".repeat(100_000))).toBe("rejected");
    expect(check("")).toBe("rejected");
  });

  it("ignores whitespace around the configured value, not around the supplied one", () => {
    const check = inviteCodeChecker("  staff-room-2026  ");

    // The configured side is trimmed because a .env line usually has stray
    // whitespace. The supplied side is not: trimming it would mean two
    // different submitted strings are accepted, for no benefit.
    expect(check("staff-room-2026")).toBe("accepted");
    expect(check("  staff-room-2026  ")).toBe("rejected");
  });
});
