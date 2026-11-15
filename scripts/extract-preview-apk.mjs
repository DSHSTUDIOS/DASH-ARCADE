import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const downloads = new URL("../downloads/", import.meta.url);
const parts = ["aa", "ab", "ac", "ad", "ae"];
const buffers = await Promise.all(
  parts.map((part) => readFile(new URL(`preview-apk/part-${part}`, downloads))),
);
const apk = Buffer.concat(buffers);
const expected = "9394c19581d2daffdf3f5683849281f2ab1a885b5b19add49e82684633adf12e";
if (createHash("sha256").update(apk).digest("hex") !== expected) {
  throw new Error("Preview APK checksum mismatch. Fetch a fresh copy of all parts.");
}
const destination = new URL("Dash-Arcade-v2-debug.apk", downloads);
await writeFile(destination, apk);
console.log("Verified and wrote downloads/Dash-Arcade-v2-debug.apk");
