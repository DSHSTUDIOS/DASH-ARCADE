import type { NextConfig } from "next";

const nativeBuild = process.env.ARCADE_STATIC_EXPORT === "1";
const config: NextConfig = {
  ...(nativeBuild ? { output: "export", trailingSlash: true } : {}),
  devIndicators: false,
};
export default config;
