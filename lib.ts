import fs from "node:fs/promises";
import * as cheerio from "cheerio";
import { LRUCache } from "lru-cache";

export interface Dog {
  name: string;
  bio: string;
}

export class Cache {
  #cacheFile: string;
  cache: LRUCache<string, string>;

  constructor(opts = {}, cacheFile: string) {
    const defaultOpts = {
      max: 100,
      ttl: 1_000 * 60 * 60,
      async fetchMethod(cacheKey) {
        console.log(`Fetching ${cacheKey}`);
        const res = await fetch(cacheKey);
        return res.text();
      },
    };
    this.#cacheFile = cacheFile;
    this.cache = new LRUCache({ ...defaultOpts, ...opts });
  }

  /**
   * Proxy method for the LRUCache#fetch() method.
   * @param url
   * @returns string
   */
  async fetch(url): Promise<string | undefined> {
    return await this.cache.fetch(url);
  }

  async load(cacheFile: string = this.#cacheFile) {
    if (cacheFile) {
      // Import the local cache file...
      await import(cacheFile, { with: { type: "json" } })
        // ... then populate the cache.
        .then((data: any) => this.cache.load(data.default))
        .catch((_err: Error) => {
          /* Ignore error. Probably just missing cache file */
        });
    }
  }

  async save(cacheFile: string = this.#cacheFile) {
    if (cacheFile) {
      await fs.writeFile(cacheFile, JSON.stringify(this.cache.dump()));
    }
  }
}

export async function fetchDogs(cache: Cache): Promise<Dog[]> {
  const html = await cache.fetch("https://fureverendeavour.ca/available-dogs");
  await cache.save();

  const $ = cheerio.load(html!);

  return $("section[data-ux=Section]:has(h2[data-ux=SectionHeading])")
    .map((idx, el) => {
      const $el = $(el);
      const name = $el.find("h2").text().trim();
      const bio = $el
        .find("div[data-ux=ContentBasic] > div[data-ux=ContentText] > p")
        .map((idx, el) => {
          const txt = $(el).text().trim();
          if (txt.length) {
            return txt.replace(/\s+/g, " ");
          }
        })
        .get()
        .filter(
          // Ignore lines that are:
          // - `{dog name}`
          // - `{dog name} (continued)`
          // - `{dog name} (continued...)`
          (str) => !new RegExp(`^${name}(\s\(continued(\.\.\.)?)?\)?`).test(str)
        )
        .join("\n\n");

      return { name, bio };
    })
    .get();
}
