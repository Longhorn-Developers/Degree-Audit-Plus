import { describe, expect, test } from "bun:test";
import { createCookieProbeGate } from "../../features/session/cookie-probe-gate";

// UT re-sets the session cookie on every response, including the login probe's
// own; the gate keeps the cookie watcher from probing in a loop.
describe("cookie probe gate", () => {
  test("probes once for a new session id, then ignores identical re-sets", () => {
    const gate = createCookieProbeGate(60_000);
    expect(gate.shouldProbe("abc", 0)).toBe(true);
    expect(gate.shouldProbe("abc", 100)).toBe(false);
    expect(gate.shouldProbe("abc", 200)).toBe(false);
  });

  test("throttles probes for changing ids to one per interval", () => {
    const gate = createCookieProbeGate(60_000);
    expect(gate.shouldProbe("a", 0)).toBe(true);
    expect(gate.shouldProbe("b", 1_000)).toBe(false);
    expect(gate.shouldProbe("c", 59_999)).toBe(false);
    expect(gate.shouldProbe("d", 60_000)).toBe(true);
    expect(gate.shouldProbe("e", 60_001)).toBe(false);
  });

  test("a rotated id inside the interval is not re-probed later just for repeating", () => {
    const gate = createCookieProbeGate(60_000);
    expect(gate.shouldProbe("a", 0)).toBe(true);
    expect(gate.shouldProbe("b", 1_000)).toBe(false);
    // Same value again after the interval — nothing new to learn.
    expect(gate.shouldProbe("b", 70_000)).toBe(false);
  });

  test("reset() treats the next set as a new session even with the same id", () => {
    const gate = createCookieProbeGate(60_000);
    expect(gate.shouldProbe("abc", 0)).toBe(true);
    gate.reset();
    expect(gate.shouldProbe("abc", 60_000)).toBe(true);
  });

  test("reset() does not bypass the interval throttle", () => {
    const gate = createCookieProbeGate(60_000);
    expect(gate.shouldProbe("abc", 0)).toBe(true);
    gate.reset();
    expect(gate.shouldProbe("abc", 1_000)).toBe(false);
  });
});
