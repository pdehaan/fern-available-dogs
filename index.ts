#!/usr/bin/env node --no-warnings=ExperimentalWarnings

import fs from "node:fs/promises";
import { Cache, fetchDogs } from "./lib.ts";

const TODAY = new Date().toLocaleDateString();

const LATEST_FILES = await fs.glob("./data/*.json");
const LATEST_FILE = await Array.fromAsync(LATEST_FILES).then((arr) => arr.at(-1));

let LATEST_JSON = {};
if (LATEST_FILE) {
  LATEST_JSON = await import(`./${LATEST_FILE}`, {
    with: { type: "json" },
  }).then((res) => res.default);
}

const cache = new Cache({}, "./.cache.json");
await cache.load();
const dogs = await fetchDogs(cache);

if (JSON.stringify(dogs) !== JSON.stringify(LATEST_JSON)) {
  await fs.writeFile(`./data/${TODAY}.json`, JSON.stringify(dogs, null, 2));
} else {
  console.log(`No changes. Skipping.`);
}
