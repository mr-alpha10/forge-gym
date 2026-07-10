"use client";
import { useEffect, useState } from "react";
import { api, type Routine } from "@/lib/api";
import { CheckIcon, PlusIcon } from "./icons";

export default function AddToRoutine({
  exerciseId,
  exerciseName,
  onClose,
}: {
  exerciseId: string;
  exerciseName: string;
  onClose: () => void;
}) {
  const [routines, setRoutines] = useState<Routine[] | null>(null);
  const [busyDay, setBusyDay] = useState<string | null>(null);
  const [addedTo, setAddedTo] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      setRoutines(await api.routines());
    } catch {
      setRoutines([]);
      setErr("Couldn't load your routines.");
    }
  }
  useEffect(() => {
    load();
  }, []);

  // Esc closes; also lock background scroll while the sheet is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function addTo(dayId: string, label: string, routineName: string) {
    if (busyDay) return;
    setBusyDay(dayId);
    setErr(null);
    try {
      await api.addRoutineExercise(dayId, { exerciseId });
      setAddedTo(`${routineName} · ${label}`);
      setTimeout(onClose, 900);
    } catch {
      setErr("Couldn't add it. Try again.");
      setBusyDay(null);
    }
  }

  async function createRoutine() {
    const n = newName.trim();
    if (!n || creating) return;
    setCreating(true);
    try {
      const r = await api.createRoutine({ name: n });
      // A brand new routine has no days — give it one so there's a target.
      await api.addDay(r.id, { label: "Day 1" });
      setNewName("");
      await load();
    } catch {
      setErr("Couldn't create the routine.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Add to routine">
        <div className="sheet-grip" />

        {addedTo ? (
          <div className="sheet-done">
            <div className="sheet-check">
              <CheckIcon s={22} />
            </div>
            <div className="sheet-done-t">Added to {addedTo}</div>
          </div>
        ) : (
          <>
            <div className="eyebrow">Add to routine</div>
            <h3 className="sheet-title">{exerciseName}</h3>
            <p className="sub" style={{ marginTop: 6, marginBottom: 4 }}>
              Pick the day you want it on.
            </p>

            {err && <div className="error">{err}</div>}

            {routines === null ? (
              <div className="loading" style={{ padding: "30px 0" }}>
                Loading routines…
              </div>
            ) : routines.length === 0 ? (
              <p className="sub" style={{ marginTop: 14 }}>
                You don&apos;t have any routines yet. Create one below.
              </p>
            ) : (
              <div style={{ marginTop: 14 }}>
                {routines.map((r) => (
                  <div className="sheet-routine" key={r.id}>
                    <div className="sheet-rname">{r.name}</div>
                    {r.days.length ? (
                      <div className="daychips">
                        {r.days.map((d) => (
                          <button
                            key={d.id}
                            className="daychip"
                            disabled={!!busyDay}
                            onClick={() => addTo(d.id, d.label, r.name)}
                          >
                            {busyDay === d.id ? "…" : d.label}
                            <span className="daycount">{d.exercises.length}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="sub" style={{ fontSize: 12, marginTop: 4 }}>
                        No days yet — add one from the Routines screen.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="addrow" style={{ marginTop: 16 }}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createRoutine()}
                placeholder="Or create a new routine…"
              />
              <button onClick={createRoutine} disabled={!newName.trim() || creating}>
                <PlusIcon s={14} />
              </button>
            </div>

            <button className="btn ghost-cancel" onClick={onClose}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
