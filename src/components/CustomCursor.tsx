"use client";

import { useEffect, useRef } from "react";

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: -100, y: -100 });
  const follower = useRef({ x: -100, y: -100 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const cursor = cursorRef.current;
    const follow = followerRef.current;
    if (!cursor || !follow) return;

    if (window.matchMedia("(pointer: coarse)").matches) return;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const onMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      cursor.style.transform = `translate(${e.clientX - 6}px, ${e.clientY - 6}px)`;
    };

    const animate = () => {
      follower.current.x = lerp(follower.current.x, mouse.current.x, 0.14);
      follower.current.y = lerp(follower.current.y, mouse.current.y, 0.14);
      follow.style.transform = `translate(${follower.current.x - 18}px, ${follower.current.y - 18}px)`;
      rafRef.current = requestAnimationFrame(animate);
    };

    document.addEventListener("mousemove", onMove);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      <div ref={cursorRef} className="cursor" />
      <div ref={followerRef} className="cursor-follower" />
    </>
  );
}
