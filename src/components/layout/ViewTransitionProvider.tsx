"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

function supportsViewTransitions(): boolean {
  return typeof document !== "undefined" && "startViewTransition" in document;
}

/** Enables native View Transitions API for in-app navigation. */
export function ViewTransitionProvider() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!supportsViewTransitions()) return;

    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a.vt-link") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) return;
      if (anchor.target === "_blank") return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      e.preventDefault();
      const doc = document as Document & {
        startViewTransition?: (cb: () => void) => void;
      };
      doc.startViewTransition?.(() => {
        router.push(href);
      });
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [router]);

  // Re-trigger transition class on route change for fallback animation
  useEffect(() => {
    document.documentElement.dataset.route = pathname;
  }, [pathname]);

  return null;
}
