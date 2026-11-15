import type { Metadata, Viewport } from "next";
import PwaRegistration from "@/components/PwaRegistration";
import "./globals.css";
import "./sketchbook.css";

export const metadata: Metadata = {
  title: "Dash Arcade | TV Party Hub",
  description:
    "One TV, phones for controllers, and eleven games for the whole room.",
  applicationName: "Dash Arcade",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Dash Arcade",
  },
  other: { "apple-mobile-web-app-capable": "yes" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#fff7e4",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PwaRegistration />
        {children}
      </body>
    </html>
  );
}
