import { useState, useEffect, useRef } from "react";

export function useRotatingText(texts = [], interval = 3000) {
  const [current, setCurrent] = useState(texts[0] || "");
  const indexRef = useRef(0);

  useEffect(() => {
    if (texts.length === 0) return;

    const id = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % texts.length;
      setCurrent(texts[indexRef.current]);
    }, interval);

    return () => clearInterval(id);
  }, [texts, interval]);

  return current;
}
