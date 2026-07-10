"use client";
import { useEffect, useState } from "react";
import { api, imgUrl, type Exercise } from "@/lib/api";
import { cap, daysAgo } from "@/lib/format";
import { BackIcon, PhotoIcon, PlusIcon, RoutineIcon } from "./icons";
import AddToRoutine from "./AddToRoutine";

export default function ExerciseDetail({
  exId,
  groupName,
  onBack,
  onLog,
}: {
  exId: string;
  groupName?: string;
  onBack: () => void;
  onLog: (ex: Exercise) => void;
}) {
  const [ex, setEx] = useState<Exercise | null>(null);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    let on = true;
    api
      .exercise(exId)
      .then((e) => on && setEx(e))
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [exId]);

  if (!ex) return <div className="loading">Loading…</div>;

  const imgs = ex.images || [];
  const sub = ex.lastSession ? `Last trained ${daysAgo(ex.lastSession.performedAt)}` : "Not logged yet";

  return (
    <>
      <div className="topbar">
        <button className="back" onClick={onBack}>
          <BackIcon s={15} /> {groupName || "Back"}
        </button>
      </div>
      <div className="eyebrow">
        {cap(ex.equipment) || "Bodyweight"} · {cap(ex.level) || "All levels"}
      </div>
      <h2 className="scr-title">{ex.name}</h2>
      <p className="sub">{sub}</p>

      {imgs.length >= 2 ? (
        <div className="imgpair">
          <div className="imgframe">
            <span className="tag">start</span>
            <img src={imgUrl(imgs[0])} alt={`${ex.name} start`} loading="lazy" />
          </div>
          <div className="imgframe">
            <span className="tag">finish</span>
            <img src={imgUrl(imgs[imgs.length - 1])} alt={`${ex.name} finish`} loading="lazy" />
          </div>
        </div>
      ) : imgs.length === 1 ? (
        <div className="imgframe solo">
          <img src={imgUrl(imgs[0])} alt={ex.name} loading="lazy" />
        </div>
      ) : (
        <div className="noimg">
          <PhotoIcon s={46} />
        </div>
      )}

      <div className="pillrow">
        {ex.primaryMuscles[0] && <span className="pill primary">{cap(ex.primaryMuscles[0])}</span>}
        {ex.secondaryMuscles.map((m) => (
          <span key={m} className="pill">
            {cap(m)}
          </span>
        ))}
      </div>
      <div className="meta">
        <div>
          Equipment<b>{cap(ex.equipment) || "—"}</b>
        </div>
        <div>
          Level<b>{cap(ex.level) || "—"}</b>
        </div>
        <div>
          Steps<b>{ex.instructions.length}</b>
        </div>
      </div>

      <div className="howto">
        <div className="field-label">How to perform</div>
        {ex.instructions.map((s, i) => (
          <div className="step" key={i}>
            <span className="sidx">{String(i + 1).padStart(2, "0")}</span>
            <span className="stx">{s}</span>
          </div>
        ))}
      </div>

      <div className="cta">
        <div className="cta-row">
          <button className="btn ghost icon-only" onClick={() => setSheet(true)} title="Add to routine" aria-label="Add to routine">
            <RoutineIcon s={17} />
          </button>
          <button className="btn primary" onClick={() => onLog(ex)}>
            <PlusIcon s={16} /> Log today&apos;s sets
          </button>
        </div>
      </div>

      {sheet && <AddToRoutine exerciseId={ex.id} exerciseName={ex.name} onClose={() => setSheet(false)} />}
    </>
  );
}
