import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const downloads = new URL("../downloads/", import.meta.url);
const parts = ["aa", "ab", "ac", "ad", "ae"];
const buffers = await Promise.all(
  parts.map((part) => readFile(new URL(`preview-apk/part-${part}`, downloads))),
);
const apk = Buffer.concat(buffers);
const expected = "160abeb464896eaf4755c7d73d0026076a9c84bd7e310b0ccdbcccbef3a941b3";
if (createHash("sha256").update(apk).digest("hex") !== expected) {
  throw new Error("Preview APK checksum mismatch. Fetch a fresh copy of all parts.");
}
const destination = new URL("Dash-Arcade-v2-debug.apk", downloads);
await writeFile(destination, apk);
console.log("Verified and wrote downloads/Dash-Arcade-v2-debug.apk");
