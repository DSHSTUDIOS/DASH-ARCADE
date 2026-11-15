import { mkdirSync } from "node:fs";
import sharp from "sharp";

const ink = "#35283d",
  paper = "#fff7e4",
  safety = "#f3c3d4",
  volt = "#f9d775";
const cartridge = `<rect x="31" y="47" width="125" height="102" rx="14" fill="${ink}"/>
  <rect x="23" y="39" width="125" height="102" rx="14" fill="${paper}" stroke="${ink}" stroke-width="5"/>
  <rect x="36" y="52" width="99" height="63" rx="7" fill="${volt}" stroke="${ink}" stroke-width="4"/>
  <path d="M47 62h75M47 67h43" stroke="white" stroke-width="3" opacity=".65"/>
  <path d="m93 67-21 22h13l-3 17 23-25H92Z" fill="${safety}" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M47 124v13m9-13v13m9-13v13m9-13v13m9-13v13m9-13v13m9-13v13m9-13v13m9-13v13" stroke="${ink}" stroke-width="3"/>`;
const mark = `<path d="M7 5h17q9 0 9 10v13q0 9-9 9H7Zm8 7v18h8q3 0 3-3V15q0-3-3-3ZM38 37l9-32h13l9 32h-8l-2-7H47l-2 7Zm11-14h8l-4-12Zm24 5h8v1q0 1 2 1h11q2 0 2-2v-1q0-2-2-2H83q-10 0-10-9v-2q0-9 10-9h12q9 0 9 8v2h-8v-1q0-2-2-2H83q-2 0-2 2v1q0 2 2 2h11q10 0 10 9v2q0 9-10 9H82q-9 0-9-8Zm36-23h8v12h13V5h8v32h-8V25h-13v12h-8Z" fill="${ink}" fill-rule="evenodd"/>`;
const card = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
  <rect width="180" height="180" fill="${safety}"/>
  <path d="M11 16h30m-30 7h17m138 118v23m-7-14v14" stroke="${ink}" stroke-width="2"/>
  <path d="M5 43q73-34 170-13M6 56q79-30 169-14M5 144q85-26 172-10M3 160q85-27 174-11M5 170q82-23 169-8" fill="none" stroke="#d686aa" stroke-width="3" opacity=".54"/>
  <g transform="rotate(-7 86 88)">${cartridge}</g></svg>`;
const banner = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180">
  <defs><pattern id="dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="1.8" cy="1.8" r="1" fill="${ink}" opacity=".35"/></pattern></defs>
  <rect width="320" height="180" fill="${safety}"/><rect x="4" y="4" width="312" height="172" fill="url(#dots)" stroke="${ink}" stroke-width="5"/>
  <g transform="translate(4 6) scale(.88)">${cartridge}</g>
  <path d="M144 40h155v100H144Z" fill="${ink}"/><path d="M138 34h155v100H138Z" fill="${paper}" stroke="${ink}" stroke-width="4"/>
  <g transform="translate(145 41)">${mark}</g>
  <rect x="152" y="89" width="128" height="25" fill="${volt}" stroke="${ink}" stroke-width="2"/>
  <text x="216" y="107" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="15" letter-spacing="4" fill="${ink}">ARCADE</text>
  <text x="147" y="155" font-family="monospace" font-weight="bold" font-size="10" fill="${ink}">MADE BY PRATIK DASH</text></svg>`;
const maskable = card.replace(
  cartridge,
  `<g transform="translate(23 23) scale(.75)">${cartridge}</g>`,
);

mkdirSync("public/icons", { recursive: true });
mkdirSync("android-tv-manifest/res/drawable-xhdpi", { recursive: true });
await Promise.all([
  ...[
    ["icon-192", 192],
    ["icon-512", 512],
    ["apple-touch-icon", 180],
  ].map(([name, size]) =>
    sharp(Buffer.from(card), { density: 216 })
      .resize(size, size)
      .png()
      .toFile(`public/icons/${name}.png`),
  ),
  sharp(Buffer.from(maskable), { density: 216 })
    .resize(512, 512)
    .png()
    .toFile("public/icons/maskable-512.png"),
  sharp(Buffer.from(card), { density: 144 })
    .resize(192, 192)
    .png()
    .toFile("android-tv-manifest/res/drawable-xhdpi/dash_launcher_icon.png"),
  sharp(Buffer.from(banner))
    .png()
    .toFile("android-tv-manifest/res/drawable-xhdpi/dash_tv_banner.png"),
]);
