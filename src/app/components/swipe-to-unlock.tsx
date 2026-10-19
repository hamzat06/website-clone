"use client";

import { useEffect, useRef, useState } from "react";

const KNOB_SIZE = 52;
const PADDING = 4;
const UNLOCK_THRESHOLD = 0.9;

type SwipeToUnlockProps = {
  label?: string;
  onUnlock?: () => void;
};

export default function SwipeToUnlock({
  label = "Swipe to unlock",
  onUnlock,
}: SwipeToUnlockProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  // Keep the measured track width in state (not read from the ref during
  // render), so it's correct from the first paint and on resize.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setTrackWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const max = Math.max(trackWidth - KNOB_SIZE - PADDING * 2, 0);

  const complete = () => {
    setOffset(max);
    setUnlocked(true);
    onUnlock?.();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (unlocked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startX.current = e.clientX - offset;
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    const next = Math.min(Math.max(e.clientX - startX.current, 0), max);
    setOffset(next);
  };

  const handlePointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (offset >= max * UNLOCK_THRESHOLD) {
      complete();
    } else {
      setOffset(0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (unlocked) return;
    if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      complete();
    }
  };

  // While actually dragging, the fill's edge sits at the knob's horizontal
  // center — not its full width — and is cut straight (no rounded cap) right
  // there. At rest (not dragging, not unlocked) it's exactly 0: invisible.
  // Once unlocked, it takes over the full track and rounds to match it.
  const knobCenter = PADDING + offset + KNOB_SIZE / 2;
  const fillWidth = unlocked ? trackWidth : dragging ? knobCenter : 0;

  return (
    <div className="relative w-full">
      <div
        ref={trackRef}
        className="relative h-15 w-full select-none overflow-hidden rounded-full bg-slate-100/70 shadow-[inset_0_0_0_1px_rgba(226,232,240,1),inset_0_1px_2px_rgba(15,23,42,0.06)]"
      >
        {/* fill that trails the knob: a flat (non-rounded) leading edge that
            stops at the knob's center while dragging, full-bleed top/bottom */}
        <div
          className={`absolute inset-y-0 left-0 transition-[width,border-radius,background-color] ${
            unlocked ? "rounded-full bg-[#54b685]" : "rounded-l-full bg-indigo-600"
          }`}
          style={{
            width: fillWidth,
            transitionDuration: dragging ? "0ms" : "250ms",
            transitionTimingFunction: "ease",
          }}
        />

        {/* label stays centered across the whole track and simply fades out */}
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-[15px] font-medium text-[#9D9484] transition-opacity"
          style={{ opacity: unlocked ? 0 : 1 }}
        >
          {label}
        </span>
        {/* identical label, dark, clipped to only the portion the fill has
            actually reached — so the text reads dark as the color passes under it */}
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-[15px] font-medium text-slate-900"
          style={{
            opacity: unlocked ? 0 : 1,
            clipPath: `inset(0 ${Math.max(trackWidth - fillWidth, 0)}px 0 0)`,
            transitionDuration: dragging ? "0ms" : "250ms",
            transitionTimingFunction: "ease",
            transitionProperty: "clip-path, opacity",
          }}
        >
          {label}
        </span>

        <button
          type="button"
          aria-label={label}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          className="absolute flex cursor-grab touch-none items-center justify-center rounded-full bg-white text-slate-600 shadow-[0_2px_8px_rgba(15,23,42,0.18)] outline-none focus-visible:ring-2 focus-visible:ring-slate-400 active:cursor-grabbing"
          style={{
            top: PADDING,
            left: PADDING,
            width: KNOB_SIZE,
            height: KNOB_SIZE,
            transform: `translateX(${offset}px)`,
            transition: dragging ? "none" : "transform 250ms ease",
          }}
        >
          {unlocked ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#54b685]"
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          )}
        </button>
      </div>

      {/* out of the flow, in the card's bottom space, so it never changes the
          card's height or makes it jump when it appears */}
      <p
        className="absolute inset-x-0 top-full mt-4 text-center text-[15px] text-[#54b685] transition-opacity"
        style={{ opacity: unlocked ? 1 : 0 }}
        aria-hidden={!unlocked}
      >
        Security check complete!
      </p>
    </div>
  );
}
