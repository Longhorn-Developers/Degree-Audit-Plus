import { expect, test } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadDevUtCredentials } from "../scripts/dev-ut-credentials";

test("reads literal credentials and prefers .env.local over expanded environment", () => {
  const root = mkdtempSync(path.join(tmpdir(), "dap-dev-credentials-"));
  try {
    writeFileSync(
      path.join(root, ".env"),
      "UT_DEV_EID='test-eid'\nUT_DEV_PASSWORD='fallback'",
    );
    const password = "test$UNDEFINED${OTHER}#with\\backslash";
    writeFileSync(
      path.join(root, ".env.local"),
      `UT_DEV_PASSWORD='${password}'\n`,
    );
    expect(
      loadDevUtCredentials(root, { UT_DEV_PASSWORD: "expanded-incorrectly" }),
    ).toEqual({ eid: "test-eid", password });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("supports environment-only credentials and disables incomplete credentials", () => {
  const root = mkdtempSync(path.join(tmpdir(), "dap-dev-credentials-"));
  try {
    expect(
      loadDevUtCredentials(root, {
        UT_DEV_EID: "test-eid",
        UT_DEV_PASSWORD: "password",
      }),
    ).toEqual({ eid: "test-eid", password: "password" });
    expect(loadDevUtCredentials(root, { UT_DEV_EID: "test-eid" })).toBeNull();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
