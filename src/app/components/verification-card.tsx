"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import SwipeToUnlock from "./swipe-to-unlock";

const VARIANTS = [
  {
    title: "Verify you're human",
    description: "Please slide the bar to the right to complete verification.",
    label: "Slide to verify",
  },
  {
    title: "Human verification",
    description: "Prove you're not a bot by sliding the handle.",
    label: "Drag to complete",
  },
  {
    title: "Security checkpoint",
    description: "Complete the quick challenge below to continue.",
    label: "Swipe to unlock",
  },
];

// Picked at random once per page load (it may repeat the previous one). Cached
// so re-renders, and StrictMode's double render, all see the same value.
let current: number | null = null;

function getSnapshot() {
  if (current === null) {
    current = Math.floor(Math.random() * VARIANTS.length);
  }
  return current;
}

// The server can't know which variant is next, so it renders none; React swaps
// in the real one right after hydration.
const getServerSnapshot = () => null;
const subscribe = () => () => {};

// The "verifying" intro plays once per browser session. sessionStorage is
// cleared when the tab/window closes, so a new session shows it again, while
// reloads within the same session skip straight to the card. Read once per
// page load and cached, like the variant above.
const PASSED_KEY = "verification-passed";
const LOADER_MIN_MS = 3000;
const LOADER_MAX_MS = 5000;
let needsLoader: boolean | null = null;

function getNeedsLoader() {
  if (needsLoader === null) {
    try {
      needsLoader = sessionStorage.getItem(PASSED_KEY) === null;
    } catch {
      needsLoader = true;
    }
  }
  return needsLoader;
}

function Verifying() {
  return (
    <motion.div
      key="verifying"
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-5 text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25 } }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <motion.div
        className="size-12 rounded-full border-[3px] border-slate-200 border-t-indigo-600"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, ease: "linear", repeat: Infinity }}
      />
      <p className="text-[15px] font-medium text-slate-500">
        Verifying your browser&hellip;
      </p>
    </motion.div>
  );
}

export default function VerificationCard() {
  const index = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const loaderNeeded = useSyncExternalStore(
    subscribe,
    getNeedsLoader,
    getServerSnapshot,
  );
  const [loaderDone, setLoaderDone] = useState(false);
  const variant = VARIANTS[index ?? 0];
  const showLoader = loaderNeeded === true && !loaderDone;

  useEffect(() => {
    if (!showLoader) return;
    // a random 3-5s wait so it feels like a real check rather than a fixed timer
    const delay =
      LOADER_MIN_MS + Math.random() * (LOADER_MAX_MS - LOADER_MIN_MS);
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(PASSED_KEY, "1");
      } catch {}
      setLoaderDone(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [showLoader]);

  // The server can't know the variant or whether the intro already played, so
  // it renders nothing; the client picks up right after hydration.
  const ready = index !== null && loaderNeeded !== null;

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        {ready && showLoader && <Verifying key="verifying" />}
        {ready && !showLoader && (
          <motion.section
            key="card"
            className="w-full max-w-105 min-h-68 rounded-[28px] border border-slate-200/80 bg-white p-10 text-center shadow-[0_20px_50px_-20px_rgba(15,23,42,0.18)]"
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 140, damping: 20 }}
          >
            <h1 className="text-[26px] font-semibold leading-8 tracking-tight text-[#1e293b]">
              {variant.title}
            </h1>
            <p className="mt-1 text-[15px] leading-6 text-[#64748b]">
              {variant.description}
            </p>
            <div className="mt-8">
              <SwipeToUnlock label={variant.label} />
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
