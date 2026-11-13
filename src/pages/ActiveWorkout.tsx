import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { lastSetsByExercise } from '../stats';
import type { ActiveWorkout as AW, SetType, Workout, WorkoutSet } from '../types';
import { exerciseLabel } from '../exercises';
import {
  fmtClock,
  fmtRest,
  fmtSetValue,
  fmtVolume,
  fromDisplay,
  parseTime,
  REST_OPTIONS,
  round,
  toDisplay,
  uid,
  workoutVolume,
} from '../utils';
import { Empty, Menu, nav, NumInput, TimeInput, useNow } from '../components/ui';
import { ExercisePicker } from '../components/ExercisePicker';
import { useStartWorkout } from './Home';

const NEXT_TYPE: Record<SetType, SetType> = { normal: 'warmup', warmup: 'drop', drop: 'failure', failure: 'normal' };
const TYPE_LABEL: Record<SetType, string> = { normal: '', warmup: 'W', drop: 'D', failure: 'F' };

export default function ActiveWorkout() {
  const { data, update, updateActive, exMap, history } = useStore();
  const start = useStartWorkout();
  const a = data.active;
  const unit = data.settings.unit;
  const now = useNow(1000);
  const [picker, setPicker] = useState<null | { replace?: string }>(null);
  const prev = useMemo(() => lastSetsByExercise(history, a?.editingId), [history, a?.editingId]);

  if (!a) {
    return (
      <div className="page">
        <Empty
          title="No workout in progress"
          text="Start an empty workout or pick one of your routines."
          action={
            <button className="btn primary" onClick={() => start(null)}>
              Start empty workout
            </button>
          }
        />
      </div>
    );
  }

  const doneCount = a.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);

  const setField = (exId: string, setId: string, fn: (s: WorkoutSet, w: AW) => void) =>
    updateActive((w) => {
      const ex = w.exercises.find((e) => e.id === exId);
      const s = ex?.sets.find((x) => x.id === setId);
      if (s) fn(s, w);
    });

  const finish = () => {
    const incomplete = a.exercises.some((e) => e.sets.some((s) => !s.done));
    if (!doneCount) {
      alert('Complete at least one set before finishing (tap ✓ on a set), or discard the workout.');
      return;
    }
    if (incomplete && !confirm('Unfinished sets will be removed. Finish workout?')) return;
    const w: Workout = {
      id: a.editingId ?? a.id,
      name: a.name.trim() || 'Workout',
      routineId: a.routineId,
      startedAt: a.startedAt,
      endedAt: a.editingId ? a.endedAt : Date.now(),
      notes: a.notes,
      exercises: a.exercises
        .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
        .filter((e) => e.sets.length),
    };
    update((d) => {
      d.workouts = d.workouts.filter((x) => x.id !== w.id);
      d.workouts.push(w);
      d.active = null;
    });
    nav('/history/' + w.id + '?done=1');
  };

  const discard = () => {
    if (!confirm(a.editingId ? 'Discard your changes?' : 'Discard this workout? This cannot be undone.')) return;
    const back = a.editingId;
    update((d) => {
      d.active = null;
    });
    nav(back ? '/history/' + back : '/');
  };

  const addExercises = (ids: string[]) => {
    updateActive((w) => {
      if (picker?.replace) {
        const ex = w.exercises.find((e) => e.id === picker.replace);
        if (ex) ex.exerciseId = ids[0];
      } else {
        for (const id of ids)
          w.exercises.push({
            id: uid(),
            exerciseId: id,
            notes: '',
            restSec: null,
            sets: [{ id: uid(), type: 'normal', weight: null, reps: null, done: false }],
          });
      }
    });
    setPicker(null);
  };

  return (
    <div className="page workout-page">
      <header className="workout-head">
        <div className="workout-title">
          <input
            className="title-input"
            value={a.name}
            onChange={(e) => updateActive((w) => void (w.name = e.target.value))}
            aria-label="Workout name"
          />
          <div className="workout-meta">
            <span>{a.editingId ? 'Editing' : fmtClock((now - a.startedAt) / 1000)}</span>
            <span>{fmtVolume(workoutVolume(a), unit)}</span>
            <span>{doneCount} sets</span>
          </div>
        </div>
        <button className="btn primary" onClick={finish}>
          {a.editingId ? 'Save' : 'Finish'}
        </button>
      </header>

      <textarea
        className="notes"
        placeholder="Workout notes"
        rows={1}
        value={a.notes}
        onChange={(e) => updateActive((w) => void (w.notes = e.target.value))}
      />

      {a.exercises.map((ex, exIndex) => {
        const info = exMap.get(ex.exerciseId);
        const bw = info?.kind === 'bodyweight';
        const timed = info?.kind === 'duration';
        const prevSets = prev.get(ex.exerciseId) ?? [];
        let n = 0;
        const rest = ex.restSec ?? data.settings.defaultRest;
        const targetMatch = /Target: (\d+:\d{2})/.exec(ex.notes);
        const targetSec = targetMatch ? parseTime(targetMatch[1]) : null;
        return (
          <div key={ex.id} className="card ex-card">
            <div className="card-head">
              <button className="ex-name" onClick={() => nav('/exercises/' + ex.exerciseId)}>
                {info ? exerciseLabel(info) : 'Unknown exercise'}
              </button>
              <Menu
                items={[
                  ...(exIndex > 0
                    ? [
                        {
                          label: 'Move up',
                          onClick: () =>
                            updateActive((w) => {
                              const [x] = w.exercises.splice(exIndex, 1);
                              w.exercises.splice(exIndex - 1, 0, x);
                            }),
                        },
                      ]
                    : []),
                  ...(exIndex < a.exercises.length - 1
                    ? [
                        {
                          label: 'Move down',
                          onClick: () =>
                            updateActive((w) => {
                              const [x] = w.exercises.splice(exIndex, 1);
                              w.exercises.splice(exIndex + 1, 0, x);
                            }),
                        },
                      ]
                    : []),
                  { label: 'Replace exercise', onClick: () => setPicker({ replace: ex.id }) },
                  {
                    label: 'Remove exercise',
                    danger: true,
                    onClick: () =>
                      updateActive((w) => {
                        w.exercises = w.exercises.filter((e) => e.id !== ex.id);
                      }),
                  },
                ]}
              />
            </div>
            <textarea
              className="ex-notes"
              rows={3}
              placeholder="Add notes"
              value={ex.notes}
              onChange={(e) =>
                updateActive((w) => {
                  const x = w.exercises.find((y) => y.id === ex.id);
                  if (x) x.notes = e.target.value;
                })
              }
            />
            <label className="rest-select">
              ⏱ Rest:
              <select
                value={ex.restSec ?? ''}
                onChange={(e) =>
                  updateActive((w) => {
                    const x = w.exercises.find((y) => y.id === ex.id);
                    if (x) x.restSec = e.target.value === '' ? null : Number(e.target.value);
                  })
                }
              >
                <option value="">Default ({fmtRest(data.settings.defaultRest)})</option>
                {REST_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {fmtRest(r)}
                  </option>
                ))}
              </select>
            </label>

            <div className="set-table">
              <div className={timed ? 'set-row head timed' : 'set-row head'}>
                <span>Set</span>
                <span>Previous</span>
                {!timed && <span>{bw ? `+${unit}` : unit}</span>}
                <span>{timed ? 'Time' : 'Reps'}</span>
                <span>✓</span>
              </div>
              {ex.sets.map((s, i) => {
                if (s.type !== 'warmup') n++;
                const hist = prevSets[i];
                // Ghost values: same set last time, otherwise the set above in this session.
                const above = ex.sets.slice(0, i).reverse().find((x) => x.reps != null);
                const p = hist ?? (above ? { weight: above.weight, reps: above.reps } : undefined);
                const pw = p?.weight != null ? round(toDisplay(p.weight, unit), 2) : null;
                const prevText = hist ? fmtSetValue(hist, info?.kind, unit) : '—';
                return (
                  <div key={s.id} className={`set-row${s.done ? ' done' : ''}${timed ? ' timed' : ''}`}>
                    <button
                      className={`set-type t-${s.type}`}
                      title="Tap to change set type (warm-up, drop, failure)"
                      onClick={() => setField(ex.id, s.id, (x) => void (x.type = NEXT_TYPE[x.type]))}
                    >
                      {TYPE_LABEL[s.type] || n}
                    </button>
                    <button
                      className="prev"
                      disabled={!hist}
                      title="Copy previous"
                      onClick={() =>
                        setField(ex.id, s.id, (x) => {
                          x.weight = hist?.weight ?? null;
                          x.reps = hist?.reps ?? null;
                        })
                      }
                    >
                      {prevText}
                    </button>
                    {!timed && (
                      <NumInput
                        ariaLabel="Weight"
                        value={s.weight == null ? null : round(toDisplay(s.weight, unit), 2)}
                        placeholder={pw != null ? String(pw) : bw ? '0' : unit}
                        onChange={(v) => setField(ex.id, s.id, (x) => void (x.weight = v == null ? null : fromDisplay(v, unit)))}
                      />
                    )}
                    {timed ? (
                      <TimeInput
                        ariaLabel="Time"
                        value={s.reps}
                        placeholder={p?.reps != null ? fmtClock(p.reps) : targetSec != null ? fmtClock(targetSec) : '0:00'}
                        onChange={(v) => setField(ex.id, s.id, (x) => void (x.reps = v))}
                      />
                    ) : (
                      <NumInput
                        ariaLabel="Reps"
                        decimal={false}
                        value={s.reps}
                        placeholder={p?.reps != null ? String(p.reps) : 'reps'}
                        onChange={(v) => setField(ex.id, s.id, (x) => void (x.reps = v))}
                      />
                    )}
                    <button
                      className={s.done ? 'check on' : 'check'}
                      aria-label={s.done ? 'Mark set incomplete' : 'Complete set'}
                      onClick={() =>
                        setField(ex.id, s.id, (x, w) => {
                          if (!x.done) {
                            if (x.weight == null && !timed) x.weight = p?.weight ?? (bw ? 0 : null);
                            if (x.reps == null) x.reps = p?.reps ?? (timed ? targetSec : null);
                            if (x.reps == null || (x.weight == null && !bw && !timed)) return;
                            x.done = true;
                            if (rest > 0) {
                              w.restEndsAt = Date.now() + rest * 1000;
                              w.restTotal = rest;
                            }
                          } else x.done = false;
                        })
                      }
                    >
                      ✓
                    </button>
                    <button
                      className="del"
                      aria-label="Delete set"
                      onClick={() =>
                        updateActive((w) => {
                          const x = w.exercises.find((y) => y.id === ex.id);
                          if (x) x.sets = x.sets.filter((y) => y.id !== s.id);
                        })
                      }
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              className="btn ghost block"
              onClick={() =>
                updateActive((w) => {
                  const x = w.exercises.find((y) => y.id === ex.id);
                  if (!x) return;
                  const last = x.sets[x.sets.length - 1];
                  x.sets.push({
                    id: uid(),
                    type: 'normal',
                    weight: last?.weight ?? null,
                    reps: last?.reps ?? null,
                    done: false,
                  });
                })
              }
            >
              + Add set
            </button>
          </div>
        );
      })}

      <button className="btn primary block" onClick={() => setPicker({})}>
        + Add exercise
      </button>
      <button className="btn danger-ghost block" onClick={discard}>
        {a.editingId ? 'Discard changes' : 'Discard workout'}
      </button>

      {picker && <ExercisePicker multi={!picker.replace} onClose={() => setPicker(null)} onPick={addExercises} />}
    </div>
  );
}
