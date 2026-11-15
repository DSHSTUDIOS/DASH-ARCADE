import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
const run = (file, args) => {
  const result = spawnSync(file, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};
const cap = require.resolve("@capacitor/cli/bin/capacitor");
run(process.execPath, ["scripts/artwork.mjs"]);
run(process.execPath, ["scripts/export.mjs"]);
if (!existsSync("android/app/src/main/AndroidManifest.xml"))
  run(process.execPath, [cap, "add", "android"]);
cpSync("android-tv-manifest", "android/app/src/main", { recursive: true });
const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const [major, minor, patch] = version.split(".").map(Number);
const versionCode = major * 10000 + minor * 100 + patch;
const gradlePath = "android/app/build.gradle";
const gradle = readFileSync(gradlePath, "utf8")
  .replace(/versionCode \d+/, `versionCode ${versionCode}`)
  .replace(/versionName "[^"]+"/, `versionName "${version}"`);
writeFileSync(gradlePath, gradle);
run(process.execPath, [cap, "sync", "android"]);
if (process.argv.includes("--apk")) {
  process.chdir("android");
  const windows = process.platform === "win32";
  run(
    windows ? "cmd.exe" : "./gradlew",
    windows ? ["/c", "gradlew.bat", "assembleDebug"] : ["assembleDebug"],
  );
}
