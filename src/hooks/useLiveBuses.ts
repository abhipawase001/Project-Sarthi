import { useEffect, useState } from "react";
import { INITIAL_BUSES, stepBus, type Bus } from "@/lib/mockData";

export function useLiveBuses(intervalMs = 1500) {
  const [buses, setBuses] = useState<Bus[]>(INITIAL_BUSES);
  useEffect(() => {
    const t = setInterval(() => {
      setBuses((prev) => prev.map(stepBus));
    }, intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return buses;
}
