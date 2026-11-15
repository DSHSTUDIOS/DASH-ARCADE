import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const downloads = new URL("../downloads/", import.meta.url);
const parts = ["aa", "ab", "ac", "ad", "ae"];
const buffers = await Promise.all(
  parts.map((part) => readFile(new URL(`preview-apk/part-${part}`, downloads))),
);
const apk = Buffer.concat(buffers);
const expected = "237d38ca5d66dd477829825ad55d32d84e603f4c209c2b34fc4160d776e28eda";
if (createHash("sha256").update(apk).digest("hex") !== expected) {
  throw new Error("Preview APK checksum mismatch. Fetch a fresh copy of all parts.");
}
const destination = new URL("Dash-Arcade-v2-debug.apk", downloads);
await writeFile(destination, apk);
console.log("Verified and wrote downloads/Dash-Arcade-v2-debug.apk");
