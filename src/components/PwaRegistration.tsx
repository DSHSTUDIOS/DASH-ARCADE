"use client";
import { useEffect } from "react";

export default function PwaRegistration() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    )
      return;
    const native = (
      window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }
    ).Capacitor?.isNativePlatform?.();
    if (!native)
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
