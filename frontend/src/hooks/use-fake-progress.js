import { useState, useEffect, useRef } from "react";

export function useFakeProgress({ onDone } = {}) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);
  const animationRef = useRef(null);
  const startTimeRef = useRef(0);

  const start = () => {
    if (intervalRef.current) return; 
    startTimeRef.current = Date.now();
    setProgress(0);

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000; 

      setProgress((prev) => {
        if (elapsed < 10) {
          return Math.min(prev + Math.random() * 3.5, 60); 
        } else if (elapsed < 25) {
          return Math.min(prev + Math.random() * 1.4, 85); 
        } else {
          return Math.min(prev + Math.random() * 0.5, 98); 
        }
      });
    }, 300);
  };

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const animateToFull = () => {
      setProgress((prev) => {
        const next = prev + 2;
        if (next >= 100) {
          cancelAnimationFrame(animationRef.current);
          if (typeof onDone === "function") {
            setTimeout(() => {
              onDone(); 
            }, 500); 
          }
          return 100;
        }
        animationRef.current = requestAnimationFrame(animateToFull);
        return next;
      });
    };

    animationRef.current = requestAnimationFrame(animateToFull);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return { progress, start, stop };
}
