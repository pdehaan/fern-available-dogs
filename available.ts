import fs from "node:fs/promises";
import type { Dog } from "./lib.ts";

/**
 * Get the most recent data file from ./data/*.json.
 */
const latest = await Array.fromAsync(fs.glob("./data/*.json")).then(
  (files: string[]) => `./${files.at(-1)}`
);

const dogs: Dog[] = await import(latest, {
  with: { type: "json" },
}).then((r) => r.default);

for (const d of dogs) {
  console.log(`# ${d.name}\n\n${d.bio}\n\n`);
}
