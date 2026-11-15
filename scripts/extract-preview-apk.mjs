import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const downloads = new URL("../downloads/", import.meta.url);
const parts = ["aa", "ab", "ac", "ad"];
const buffers = await Promise.all(
  parts.map((part) => readFile(new URL(`preview-apk/part-${part}`, downloads))),
);
const apk = Buffer.concat(buffers);
const expected = "72ebd51c5c6da0373e2e6118e4d386ef07e941234ca4746cbd6b0080ee12317a";
if (createHash("sha256").update(apk).digest("hex") !== expected) {
  throw new Error("Preview APK checksum mismatch. Fetch a fresh copy of all parts.");
}
const destination = new URL("Dash-Arcade-v2-debug.apk", downloads);
await writeFile(destination, apk);
console.log("Verified and wrote downloads/Dash-Arcade-v2-debug.apk");
