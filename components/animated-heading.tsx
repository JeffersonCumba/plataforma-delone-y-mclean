"use client";

export function AnimatedHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h1 className={`${className} animate-fade-up`}>{children}</h1>;
}
