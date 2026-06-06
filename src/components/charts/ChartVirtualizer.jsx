import React, { useRef, useState, useEffect } from 'react';

/**
 * IntersectionObserver-based virtualizer.
 *
 * Problem solved: Recharts attaches a ResizeObserver per ResponsiveContainer.
 * In a long conversation (20+ messages), 20 ResizeObservers fire simultaneously
 * on window resize — causing visible jank on low-spec laptops.
 *
 * Solution: when a chart scrolls off-screen, unmount it and replace with a
 * same-height placeholder div. Remount when it scrolls back into view.
 * At most 2-3 live ResizeObserver instances at any time.
 */
export default function ChartVirtualizer({ children }) {
  const containerRef = useRef(null);
  const heightRef    = useRef(null);   // stored height from first mount
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
        } else {
          // Store height before unmounting to avoid layout shift on remount
          if (el.offsetHeight > 0) {
            heightRef.current = el.offsetHeight;
          }
          setVisible(false);
        }
      },
      { rootMargin: '200px' }  // start mounting 200px before entering viewport
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef}>
      {visible
        ? children
        : <div style={{ height: heightRef.current ?? 260 }} />
      }
    </div>
  );
}
