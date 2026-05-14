// Load .env.local into process.env, overriding empty values that may
// be inherited from the parent shell (e.g. macOS sets ANTHROPIC_API_KEY=""
// from Claude Desktop, which defeats Node's --env-file).
//
// Usage: import this at the top of any render script.
//   import "./load-env.mjs";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "../.env.local");

if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Override only if current value is missing or empty
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
