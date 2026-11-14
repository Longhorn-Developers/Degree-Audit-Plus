import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

export function loadDevUtCredentials(
  root = process.cwd(),
  env: Record<string, string | undefined> = process.env,
) {
  const values: Record<string, string> = {};
  for (const name of [".env", ".env.local"]) {
    const file = path.join(root, name);
    if (existsSync(file))
      Object.assign(values, parseEnv(readFileSync(file, "utf8")));
  }
  const eid = values.UT_DEV_EID ?? env.UT_DEV_EID;
  const password = values.UT_DEV_PASSWORD ?? env.UT_DEV_PASSWORD;
  return eid && password ? { eid, password } : null;
}
