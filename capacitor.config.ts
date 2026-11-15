import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pratikdash.arcade",
  appName: "Dash Arcade",
  webDir: "out",
  server: { androidScheme: "https" },
  android: { backgroundColor: "#111113" },
};
export default config;
