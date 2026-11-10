import { useMemo } from 'react';
import { useStore } from '../store';
import { computePRs } from '../stats';
import { exerciseLabel } from '../exercises';
import { fmtDate, fmtDuration, fmtTime, fmtVolume, workoutVolume } from '../utils';
import { Empty, nav } from '../components/ui';

export default function History() {
  const { history, exMap, data } = useStore();
  const prs = useMemo(() => computePRs(history, exMap), [history, exMap]);

  const groups = useMemo(() => {
    const m = new Map<string, typeof history>();
    for (const w of history) {
      const k = new Date(w.startedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(w);
    }
    return [...m.entries()];
  }, [history]);

  return (
    <div className="page">
      <header className="page-head">
        <h1>History</h1>
      </header>
      {!history.length && (
        <Empty
          title="No workouts logged yet"
          text="Finished workouts show up here."
          action={
            <button className="btn primary" onClick={() => nav('/')}>
              Start a workout
            </button>
          }
        />
      )}
      {groups.map(([month, ws]) => (
        <section key={month}>
          <div className="section-head">
            <h2>{month}</h2>
            <small className="muted">{ws.length} workouts</small>
          </div>
          {ws.map((w) => {
            const pr = prs.get(w.id)?.length ?? 0;
            return (
              <button key={w.id} className="card history-card" onClick={() => nav('/history/' + w.id)}>
                <div className="card-head">
                  <h3>{w.name}</h3>
                  {pr > 0 && <span className="badge pr">🏆 {pr} PR{pr > 1 ? 's' : ''}</span>}
                </div>
                <small className="muted">
                  {fmtDate(w.startedAt)} · {fmtTime(w.startedAt)}
                </small>
                <div className="workout-meta">
                  <span>⏱ {fmtDuration((w.endedAt ?? w.startedAt) - w.startedAt)}</span>
                  <span>🏋 {fmtVolume(workoutVolume(w), data.settings.unit)}</span>
                </div>
                <ul className="summary">
                  {w.exercises.slice(0, 6).map((ex) => {
                    const e = exMap.get(ex.exerciseId);
                    return (
                      <li key={ex.id}>
                        <span className="muted">{ex.sets.length} ×</span> {e ? exerciseLabel(e) : 'Unknown'}
                      </li>
                    );
                  })}
                  {w.exercises.length > 6 && <li className="muted">+{w.exercises.length - 6} more</li>}
                </ul>
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}
