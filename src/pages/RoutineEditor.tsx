import { useState } from 'react';
import { useStore } from '../store';
import type { Routine } from '../types';
import { exerciseLabel } from '../exercises';
import { fmtRest, REST_OPTIONS, uid } from '../utils';
import { nav, NumInput } from '../components/ui';
import { ExercisePicker } from '../components/ExercisePicker';
import { ExerciseInfo, InfoButton } from '../components/ExerciseInfo';

export default function RoutineEditor({ id }: { id: string }) {
  const { data, update, exMap } = useStore();
  const existing = data.routines.find((r) => r.id === id);
  const [r, setR] = useState<Routine>(() =>
    existing ? structuredClone(existing) : { id: uid(), name: '', exercises: [] },
  );
  const [picking, setPicking] = useState(false);
  const [infoIdx, setInfoIdx] = useState<number | null>(null);

  const edit = (fn: (r: Routine) => void) =>
    setR((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });

  const save = () => {
    update((d) => {
      const i = d.routines.findIndex((x) => x.id === r.id);
      const value = { ...r, name: r.name.trim() || 'Untitled routine' };
      if (i >= 0) d.routines[i] = value;
      else d.routines.push(value);
    });
    nav('/');
  };

  return (
    <div className="page">
      <header className="page-head">
        <button className="btn ghost small" onClick={() => nav('/')}>
          ← Cancel
        </button>
        <h1>{existing ? 'Edit routine' : 'New routine'}</h1>
        <button className="btn primary small" onClick={save} disabled={!r.exercises.length}>
          Save
        </button>
      </header>

      <input
        className="title-input boxed"
        placeholder="Routine name (e.g. Push Day)"
        value={r.name}
        autoFocus={!existing}
        onChange={(e) => edit((x) => void (x.name = e.target.value))}
      />

      {r.exercises.map((re, i) => {
        const info = exMap.get(re.exerciseId);
        return (
          <div className="card" key={i}>
            <div className="card-head">
              <div className="ex-title">
                <h3>{info ? exerciseLabel(info) : 'Unknown exercise'}</h3>
                {info && <InfoButton label={exerciseLabel(info)} onClick={() => setInfoIdx(i)} />}
              </div>
              <div className="row gap-s">
                <button className="icon-btn" disabled={i === 0} aria-label="Move up"
                  onClick={() => edit((x) => x.exercises.splice(i - 1, 0, ...x.exercises.splice(i, 1)))}>↑</button>
                <button className="icon-btn" disabled={i === r.exercises.length - 1} aria-label="Move down"
                  onClick={() => edit((x) => x.exercises.splice(i + 1, 0, ...x.exercises.splice(i, 1)))}>↓</button>
                <button className="icon-btn danger" aria-label="Remove"
                  onClick={() => edit((x) => x.exercises.splice(i, 1))}>✕</button>
              </div>
            </div>
            <div className="routine-fields">
              <label className="field">
                <span>Sets</span>
                <NumInput decimal={false} value={re.sets}
                  onChange={(v) => edit((x) => void (x.exercises[i].sets = Math.min(20, v ?? 1)))} />
              </label>
              <label className="field">
                <span>{info?.kind === 'duration' ? 'Target time' : 'Target reps'}</span>
                <input value={re.reps} placeholder={info?.kind === 'duration' ? '0:45' : '8-12'}
                  onChange={(e) => edit((x) => void (x.exercises[i].reps = e.target.value))} />
              </label>
              <label className="field">
                <span>Rest</span>
                <select value={re.restSec ?? ''}
                  onChange={(e) => edit((x) => void (x.exercises[i].restSec = e.target.value === '' ? null : Number(e.target.value)))}>
                  <option value="">Default</option>
                  {REST_OPTIONS.map((o) => (
                    <option key={o} value={o}>{fmtRest(o)}</option>
                  ))}
                </select>
              </label>
            </div>
            <textarea
              className="routine-notes"
              rows={3}
              placeholder="Notes (cues, alternatives…)"
              value={re.notes ?? ''}
              onChange={(e) => edit((x) => void (x.exercises[i].notes = e.target.value))}
            />
          </div>
        );
      })}

      <button className="btn primary block" onClick={() => setPicking(true)}>
        + Add exercises
      </button>
      {existing && (
        <button
          className="btn danger-ghost block"
          onClick={() => {
            if (!confirm('Delete this routine?')) return;
            update((d) => void (d.routines = d.routines.filter((x) => x.id !== r.id)));
            nav('/');
          }}
        >
          Delete routine
        </button>
      )}

      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(ids) => {
            edit((x) => {
              for (const exerciseId of ids) x.exercises.push({ exerciseId, sets: 3, reps: '8-12', restSec: null });
            });
            setPicking(false);
          }}
        />
      )}
      {infoIdx !== null && r.exercises[infoIdx] && (
        <ExerciseInfo
          exerciseId={r.exercises[infoIdx].exerciseId}
          onClose={() => setInfoIdx(null)}
          onSwap={(id) => edit((x) => void (x.exercises[infoIdx].exerciseId = id))}
        />
      )}
    </div>
  );
}
