import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/** Restore only page navigation; leave same-page hash navigation to the browser. */
const savedScroll = new Map<string, number>();

export function RouteScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const firstRender = useRef(true);

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => { window.history.scrollRestoration = previous; };
  }, []);

  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
    } else if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    } else if (navigationType === "POP" && savedScroll.has(location.key)) {
      window.scrollTo(0, savedScroll.get(location.key) ?? 0);
    } else {
      window.scrollTo(0, 0);
    }
    return () => {
      savedScroll.set(location.key, window.scrollY);
      if (savedScroll.size > 100) {
        const oldest = savedScroll.keys().next().value;
        if (oldest) savedScroll.delete(oldest);
      }
    };
  }, [location.key, location.hash, navigationType]);

  return null;
}
