const COOKIE_PROBE_MIN_INTERVAL_MS = 60_000;

// Decides whether a session-cookie set event warrants a network probe.
export function createCookieProbeGate(
  minIntervalMs = COOKIE_PROBE_MIN_INTERVAL_MS,
) {
  let lastValue: string | undefined;
  let lastProbeAt = -Infinity;
  return {
    shouldProbe(value: string, now: number): boolean {
      if (value === lastValue) return false;
      lastValue = value;
      if (now - lastProbeAt < minIntervalMs) return false;
      lastProbeAt = now;
      return true;
    },
    reset(): void {
      lastValue = undefined;
    },
  };
}
