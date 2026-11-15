"use client";
import { useEffect, useState } from "react";

export function useClock(resolution = 200) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const interval = setInterval(tick, resolution);
    return () => clearInterval(interval);
  }, [resolution]);
  return now;
}
