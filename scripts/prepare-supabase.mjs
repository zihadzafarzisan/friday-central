import { mkdir, copyFile, readdir } from "node:fs/promises";
const source = new URL("../packages/db/migrations/", import.meta.url);
const target = new URL("../supabase/migrations/", import.meta.url);
await mkdir(target, { recursive: true });
for (const file of await readdir(source))
  if (file.endsWith(".sql")) await copyFile(new URL(file, source), new URL(file, target));
console.log("Prepared Supabase migrations from packages/db/migrations.");
