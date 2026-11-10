import { useCallback } from 'react';
import { newWorkoutFromRoutine, useStore } from '../store';
import type { Routine } from '../types';
import { exerciseLabel } from '../exercises';
import { fmtClock, fmtDate, fmtDuration, fmtVolume, uid, weekStart, workoutVolume } from '../utils';
import { Empty, Menu, nav, useNow } from '../components/ui';

export function useStartWorkout() {
  const { data, update } = useStore();
  return useCallback(
    (routine: Routine | null) => {
      if (data.active) {
        if (!confirm('You already have a workout in progress. Discard it and start a new one?')) {
          nav('/workout');
          return;
        }
      }
      update((d) => {
        d.active = newWorkoutFromRoutine(routine);
      });
      nav('/workout');
    },
    [data.active, update],
  );
}

export default function Home() {
  const { data, update, exMap, history } = useStore();
  const start = useStartWorkout();
  const now = useNow(1000);
  const thisWeek = history.filter((w) => w.startedAt >= weekStart(Date.now())).length;
  const last = history[0];

  return (
    <div className="page">
      <header className="page-head">
        <h1>Workout</h1>
      </header>

      {data.active ? (
        <button className="card active-card" onClick={() => nav('/workout')}>
          <div>
            <small className="accent">In progress</small>
            <strong>{data.active.name}</strong>
          </div>
          <span className="clock">{fmtClock((now - data.active.startedAt) / 1000)}</span>
        </button>
      ) : (
        <button className="btn primary block big" onClick={() => start(null)}>
          + Start empty workout
        </button>
      )}

      <div className="row-stats">
        <div className="mini">
          <strong>{thisWeek}</strong>
          <small>this week</small>
        </div>
        <div className="mini">
          <strong>{history.length}</strong>
          <small>total workouts</small>
        </div>
        {last && (
          <button className="mini link" onClick={() => nav('/history/' + last.id)}>
            <strong>{fmtDate(last.startedAt).split(',').slice(0, 2).join(',')}</strong>
            <small>last: {last.name}</small>
          </button>
        )}
      </div>

      <section>
        <div className="section-head">
          <h2>Routines</h2>
          <button className="btn small ghost" onClick={() => nav('/routine/new')}>
            + New routine
          </button>
        </div>

        {data.routines.length === 0 && (
          <Empty
            title="No routines yet"
            text="Create a routine (e.g. Push, Pull, Legs) to start workouts in one tap."
            action={
              <button className="btn primary" onClick={() => nav('/routine/new')}>
                Create routine
              </button>
            }
          />
        )}

        <div className="grid">
          {data.routines.map((r) => {
            const lastDone = history.find((w) => w.routineId === r.id);
            return (
              <div key={r.id} className="card routine">
                <div className="card-head">
                  <h3>{r.name}</h3>
                  <Menu
                    items={[
                      { label: 'Edit routine', onClick: () => nav('/routine/' + r.id) },
                      {
                        label: 'Duplicate',
                        onClick: () =>
                          update((d) => {
                            d.routines.push({ ...structuredClone(r), id: uid(), name: r.name + ' (copy)' });
                          }),
                      },
                      {
                        label: 'Delete',
                        danger: true,
                        onClick: () =>
                          confirm(`Delete routine "${r.name}"?`) &&
                          update((d) => {
                            d.routines = d.routines.filter((x) => x.id !== r.id);
                          }),
                      },
                    ]}
                  />
                </div>
                <p className="muted clamp">
                  {r.exercises.map((e) => (exMap.get(e.exerciseId) ? exerciseLabel(exMap.get(e.exerciseId)!) : '?')).join(', ') ||
                    'No exercises'}
                </p>
                {lastDone && (
                  <small className="muted">
                    Last: {fmtDate(lastDone.startedAt)} · {fmtDuration((lastDone.endedAt ?? 0) - lastDone.startedAt)} ·{' '}
                    {fmtVolume(workoutVolume(lastDone), data.settings.unit)}
                  </small>
                )}
                <button className="btn primary block" onClick={() => start(r)}>
                  Start routine
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
