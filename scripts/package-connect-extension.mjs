import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
const source = new URL("apps/connect-extension/", root);
const files = [
  "manifest.json",
  "shared.js",
  "capture.js",
  "data-capture.js",
  "bridge.js",
  "background.js",
  "popup.html",
  "popup.js",
  "popup.css",
  "README.md",
];
const output = new URL("apps/web/public/downloads/friday-connect-extension.zip", root);

// A deterministic, uncompressed ZIP using built-in APIs only. Include an explicit
// allowlist so tests, local data and other workspace files never enter the bundle.
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
const local = [];
const directory = [];
let offset = 0;
for (const file of files) {
  const data = await readFile(new URL(file, source));
  const name = Buffer.from(file);
  const crc = crc32(data);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6);
  header.writeUInt16LE(33, 12); // 1980-01-01
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(name.length, 26);
  local.push(header, name, data);
  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50, 0);
  entry.writeUInt16LE(20, 4);
  entry.writeUInt16LE(20, 6);
  entry.writeUInt16LE(0x0800, 8);
  entry.writeUInt16LE(33, 14);
  entry.writeUInt32LE(crc, 16);
  entry.writeUInt32LE(data.length, 20);
  entry.writeUInt32LE(data.length, 24);
  entry.writeUInt16LE(name.length, 28);
  entry.writeUInt32LE(offset, 42);
  directory.push(entry, name);
  offset += header.length + name.length + data.length;
}
const central = Buffer.concat(directory);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(central.length, 12);
end.writeUInt32LE(offset, 16);
await mkdir(new URL("./", output), { recursive: true });
await writeFile(output, Buffer.concat([...local, central, end]));
console.log(`Packaged FRIDAY Connect extension: ${fileURLToPath(output)}`);
