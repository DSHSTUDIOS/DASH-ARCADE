"use client";
import { useEffect, useState } from "react";

export function useClock(resolution = 200, active = true) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    tick();
    const interval = setInterval(tick, resolution);
    return () => clearInterval(interval);
  }, [resolution, active]);
  return now;
}
