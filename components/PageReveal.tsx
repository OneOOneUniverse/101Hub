"use client";

import { useEffect } from "react";
import gsap from "gsap";

/**
 * PageReveal — runs a one-time GSAP entrance animation on the main page
 * content after the site loader has exited. Drop this anywhere inside the
 * layout body; it renders nothing itself.
 *
 * Animates:
 *   • The <main> element   — fades + slides up
 *   • Navbar / header      — fades + slides down from top
 */
export default function PageReveal() {
  useEffect(() => {
    // Wait for the loader overlay exit animation to complete (~1.4 s total)
    // then reveal the page with a staggered entrance.
    const delay = 1350;

    const t = setTimeout(() => {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        // Navbar slides down from y:-30
        tl.fromTo(
          "nav, header",
          { y: -30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.08 },
          0
        );

        // Main content rises from y:40
        tl.fromTo(
          "main",
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 },
          0.15
        );

        // Footer fades in last
        tl.fromTo(
          "footer",
          { opacity: 0 },
          { opacity: 1, duration: 0.5 },
          0.4
        );
      });

      return () => ctx.revert();
    }, delay);

    return () => clearTimeout(t);
  }, []);

  return null;
}
