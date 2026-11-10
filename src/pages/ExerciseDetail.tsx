import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { exerciseSessions, ExerciseSession } from '../stats';
import { exerciseLabel } from '../exercises';
import { fmtClock, fmtDate, fmtVolume, fmtWeight, round, toDisplay } from '../utils';
import { LineChart } from '../components/Charts';
import { Empty, nav, Stat } from '../components/ui';

type Metric = 'bestE1rm' | 'heaviest' | 'volume' | 'bestReps' | 'totalReps';

export default function ExerciseDetail({ id }: { id: string }) {
  const { exMap, history, data, update } = useStore();
  const unit = data.settings.unit;
  const ex = exMap.get(id);
  const sessions = useMemo(() => exerciseSessions(history, id), [history, id]);
  const timed = ex?.kind === 'duration';
  const bw = ex?.kind === 'bodyweight' || timed;
  const [metric, setMetric] = useState<Metric>(bw ? 'bestReps' : 'bestE1rm');
  const [range, setRange] = useState<number>(0);

  // Best weight achieved for each rep count
  const repRecords = useMemo(() => {
    const rec = new Map<number, { w: number; date: number }>();
    for (const s of sessions)
      for (const set of s.sets) {
        if (set.type === 'warmup' || !set.reps || set.weight == null) continue;
        const cur = rec.get(set.reps);
        if (!cur || set.weight > cur.w) rec.set(set.reps, { w: set.weight, date: s.date });
      }
    return [...rec.entries()].filter(([r]) => r <= 15).sort((a, b) => a[0] - b[0]);
  }, [sessions]);

  if (!ex) return <div className="page"><Empty title="Exercise not found" /></div>;

  const metrics: { key: Metric; label: string; fmt: (v: number) => string }[] = timed
    ? [
        { key: 'bestReps', label: 'Longest', fmt: (v) => fmtClock(v) },
        { key: 'totalReps', label: 'Total time', fmt: (v) => fmtClock(v) },
      ]
    : bw
    ? [
        { key: 'bestReps', label: 'Most reps', fmt: (v) => `${round(v, 0)} reps` },
        { key: 'totalReps', label: 'Total reps', fmt: (v) => `${round(v, 0)} reps` },
        { key: 'heaviest', label: 'Added weight', fmt: (v) => fmtWeight(v, unit) },
      ]
    : [
        { key: 'bestE1rm', label: 'Est. 1RM', fmt: (v) => fmtWeight(v, unit) },
        { key: 'heaviest', label: 'Heaviest', fmt: (v) => fmtWeight(v, unit) },
        { key: 'volume', label: 'Volume', fmt: (v) => fmtVolume(v, unit) },
        { key: 'bestReps', label: 'Most reps', fmt: (v) => `${round(v, 0)} reps` },
      ];
  const m = metrics.find((x) => x.key === metric) ?? metrics[0];
  const cutoff = range ? Date.now() - range * 86400000 : 0;
  const points = sessions.filter((s) => s.date >= cutoff).map((s) => ({ x: s.date, y: s[m.key] }));

  const best = (k: keyof ExerciseSession) => Math.max(0, ...sessions.map((s) => s[k] as number));
  const bestSetByE1rm = sessions
    .flatMap((s) => s.sets.filter((x) => x.type !== 'warmup').map((x) => ({ ...x, date: s.date })))
    .sort((a, b) => (b.weight ?? 0) * (1 + (b.reps ?? 0) / 30) - (a.weight ?? 0) * (1 + (a.reps ?? 0) / 30))[0];

  const usedInWorkouts = sessions.length > 0;

  return (
    <div className="page">
      <header className="page-head">
        <button className="btn ghost small" onClick={() => window.history.length > 1 ? window.history.back() : nav('/exercises')}>
          ← Back
        </button>
      </header>
      <h1 className="detail-title">{exerciseLabel(ex)}</h1>
      <p className="muted">
        {ex.muscle} · {ex.equipment}
        {ex.custom ? ' · Custom' : ''}
      </p>

      {!sessions.length ? (
        <Empty title="No history yet" text="Log this exercise in a workout to see progress charts and records." />
      ) : (
        <>
          <div className="card">
            <div className="seg wrap">
              {metrics.map((x) => (
                <button key={x.key} className={x.key === m.key ? 'on' : ''} onClick={() => setMetric(x.key)}>
                  {x.label}
                </button>
              ))}
            </div>
            <LineChart points={points} format={m.fmt} />
            <div className="seg small">
              {[
                [30, '1M'],
                [90, '3M'],
                [365, '1Y'],
                [0, 'All'],
              ].map(([d, l]) => (
                <button key={l} className={range === d ? 'on' : ''} onClick={() => setRange(d as number)}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="stats">
            {bw ? (
              <>
                <Stat label={timed ? 'Longest' : 'Most reps'} value={timed ? fmtClock(best('bestReps')) : best('bestReps')} />
                <Stat label={timed ? 'Best session time' : 'Best session reps'} value={timed ? fmtClock(best('totalReps')) : best('totalReps')} />
              </>
            ) : (
              <>
                <Stat label="Est. 1RM" value={fmtWeight(best('bestE1rm'), unit, 1)} />
                <Stat label="Heaviest" value={fmtWeight(best('heaviest'), unit)} />
                <Stat label="Best volume" value={fmtVolume(best('volume'), unit)} />
              </>
            )}
            <Stat label="Sessions" value={sessions.length} />
          </div>

          {!bw && bestSetByE1rm && (
            <p className="muted small">
              Best set: {round(toDisplay(bestSetByE1rm.weight ?? 0, unit), 2)} {unit} × {bestSetByE1rm.reps} on{' '}
              {fmtDate(bestSetByE1rm.date)}
            </p>
          )}

          {!bw && repRecords.length > 0 && (
            <div className="card">
              <h3>Rep records</h3>
              <div className="rep-grid">
                {repRecords.map(([r, v]) => (
                  <div key={r} className="rep-cell">
                    <small>{r} RM</small>
                    <strong>{fmtWeight(v.w, unit)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          <section>
            <div className="section-head">
              <h2>History</h2>
            </div>
            {[...sessions].reverse().map((s) => (
              <button key={s.workoutId} className="card history-card" onClick={() => nav('/history/' + s.workoutId)}>
                <div className="card-head">
                  <h3>{s.workoutName}</h3>
                  <small className="muted">{fmtDate(s.date)}</small>
                </div>
                <div className="set-chips">
                  {s.sets.map((x) => (
                    <span key={x.id} className={x.type === 'warmup' ? 'set-chip warm' : 'set-chip'}>
                      {timed ? fmtClock(x.reps ?? 0) : bw && !x.weight ? `${x.reps}` : `${round(toDisplay(x.weight ?? 0, unit), 2)}×${x.reps}`}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </section>
        </>
      )}

      {ex.custom && (
        <button
          className="btn danger-ghost block"
          onClick={() => {
            if (usedInWorkouts) {
              alert('This exercise is used in logged workouts and cannot be deleted.');
              return;
            }
            if (!confirm('Delete this custom exercise?')) return;
            update((d) => {
              d.exercises = d.exercises.filter((x) => x.id !== id);
              d.routines.forEach((r) => (r.exercises = r.exercises.filter((x) => x.exerciseId !== id)));
            });
            nav('/exercises');
          }}
        >
          Delete custom exercise
        </button>
      )}
    </div>
  );
}
