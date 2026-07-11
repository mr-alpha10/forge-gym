"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, clearToken, getToken, type User, type Exercise } from "@/lib/api";
import { groupById } from "@/lib/groups";
import AuthScreen from "./AuthScreen";
import Library from "./Library";
import Category from "./Category";
import ExerciseDetail from "./ExerciseDetail";
import LogSession from "./LogSession";
import Calendar from "./Calendar";
import Routines from "./Routines";

type Screen =
  | { name: "library" }
  | { name: "category"; group: string }
  | { name: "detail"; exId: string; group?: string }
  | { name: "log"; exId: string; exName: string; group?: string }
  | { name: "calendar" }
  | { name: "routines" };

const ROOT: Screen = { name: "library" };

export default function ForgeApp() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // Navigation is a stack. The top of the stack is the visible screen.
  // Each push also adds a browser history entry, so Android's hardware back
  // button (which fires `popstate`) walks back through screens instead of
  // closing the app.
  const [stack, setStack] = useState<Screen[]>([ROOT]);
  const screen = stack[stack.length - 1];

  // popstate handlers are registered once, so they'd close over a stale
  // `stack`. A ref keeps the current depth readable from inside them.
  const depthRef = useRef(1);
  useEffect(() => {
    depthRef.current = stack.length;
  }, [stack]);

  const [exitHint, setExitHint] = useState(false);
  const lastBackAtRoot = useRef(0);

  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    api.me().then(setUser).catch(() => clearToken()).finally(() => setReady(true));
  }, []);

  // Seed a history entry so the first back press has something to consume.
  useEffect(() => {
    window.history.replaceState({ forge: 0 }, "");
  }, []);

  const push = useCallback((next: Screen) => {
    window.history.pushState({ forge: Date.now() }, "");
    setStack((s) => [...s, next]);
  }, []);

  // The single back path: ask the browser to go back. `popstate` then pops
  // our stack. In-app back buttons and the hardware button share this, so
  // the two can never drift out of sync.
  const goBack = useCallback(() => window.history.back(), []);

  // Replace the top of the stack without adding history (used when a screen
  // supersedes itself, e.g. saving a log returns to the same detail screen).
  // const replaceTop = useCallback((next: Screen) => {
  //   setStack((s) => [...s.slice(0, -1), next]);
  // }, []);

  useEffect(() => {
    function onPop() {
      if (depthRef.current > 1) {
        setStack((s) => s.slice(0, -1));
        return;
      }
      // At the root. Require a second press within 2s before letting the
      // app close, so a stray tap mid-workout doesn't dump you out.
      const now = Date.now();
      if (now - lastBackAtRoot.current < 2000) return; // let the browser exit
      lastBackAtRoot.current = now;
      setExitHint(true);
      setTimeout(() => setExitHint(false), 2000);
      window.history.pushState({ forge: 0 }, ""); // re-arm; cancels the exit
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Edge swipe-back: a rightward drag starting near the left edge.
  useEffect(() => {
    let x0 = 0;
    let y0 = 0;
    let tracking = false;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      tracking = t.clientX < 28; // only from the left edge
      x0 = t.clientX;
      y0 = t.clientY;
    };
    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - x0;
      const dy = Math.abs(t.clientY - y0);
      if (dx > 70 && dy < 50 && depthRef.current > 1) goBack();
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [goBack]);

  function logout() {
    clearToken();
    setUser(null);
    setStack([ROOT]);
  }

  function render() {
    switch (screen.name) {
      case "library":
        return (
          <Library
            onOpenGroup={(group) => push({ name: "category", group })}
            onOpenExercise={(id, group) => push({ name: "detail", exId: id, group })}
            onOpenCalendar={() => push({ name: "calendar" })}
            onOpenRoutines={() => push({ name: "routines" })}
            onLogout={logout}
          />
        );
      case "category":
        return (
          <Category
            groupId={screen.group}
            onBack={goBack}
            onOpen={(id) => push({ name: "detail", exId: id, group: screen.group })}
          />
        );
      case "detail":
        return (
          <ExerciseDetail
            exId={screen.exId}
            groupName={screen.group ? groupById(screen.group)?.name : undefined}
            onBack={goBack}
            onLog={(ex: Exercise) => push({ name: "log", exId: ex.id, exName: ex.name, group: screen.group })}
          />
        );
      case "log":
        return (
          <LogSession
            exId={screen.exId}
            exName={screen.exName}
            onBack={goBack}
            // After saving, drop the log screen and land back on the detail
            // screen (which refetches and shows the new "last session").
            onSaved={() => window.history.back()}
          />
        );
      case "calendar":
        return <Calendar onBack={goBack} />;
      case "routines":
        return <Routines onBack={goBack} onOpen={(id, group) => push({ name: "detail", exId: id, group })} />;
    }
  }

  return (
    <>
    <div className="bg-aura" aria-hidden="true">
      <span className="o1" />
      <span className="o2" />
      <span className="o3" />
    </div>
      <svg className="grain" xmlns="http://www.w3.org/2000/svg">
        <filter id="grain-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={3} />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-noise)" />
      </svg>
      <div className="phone">
        <div className="viewport">
          {!ready ? (
            <div className="loading">Forge</div>
          ) : !user ? (
            <AuthScreen onAuthed={setUser} />
          ) : (
            <div className="screen" key={JSON.stringify(screen)}>
              {render()}
            </div>
          )}
        </div>
        {exitHint && <div className="exit-hint">Press back again to exit</div>}
      </div>
    </>
  );
}
