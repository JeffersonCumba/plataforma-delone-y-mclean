"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText, useGSAP);

export function AnimatedHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;

      const split = new SplitText(ref.current, { type: "lines" });

      gsap.from(split.lines, {
        duration: 1,
        y: 12,
        stagger: 0.1,
        autoAlpha: 0,
        filter: "blur(10px)",
        force3D: true,
        onComplete: () => {
          gsap.set(split.lines, { clearProps: "filter,transform" });
          split.revert();
        },
      });
    },
    { scope: ref, dependencies: [] },
  );

  return (
    <h1 ref={ref} className={className}>
      {children}
    </h1>
  );
}
