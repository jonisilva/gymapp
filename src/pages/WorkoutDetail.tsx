import { useMemo } from 'react';
import { routineFromWorkout, useStore } from '../store';
import { computePRs, prLabel } from '../stats';
import { exerciseLabel } from '../exercises';
import type { Routine } from '../types';
import { e1rm, fmtClock, fmtDate, fmtDuration, fmtSetValue, fmtTime, fmtVolume, fmtWeight, workoutSetCount, workoutVolume } from '../utils';
import { Empty, Menu, nav, Stat } from '../components/ui';
import { useStartWorkout } from './Home';

export default function WorkoutDetail({ id, justFinished }: { id: string; justFinished: boolean }) {
  const { data, update, exMap, history } = useStore();
  const start = useStartWorkout();
  const unit = data.settings.unit;
  const w = history.find((x) => x.id === id);
  const prs = useMemo(() => computePRs(history, exMap).get(id) ?? [], [history, exMap, id]);

  if (!w) return <div className="page"><Empty title="Workout not found" /></div>;

  const workoutIndex = history.length - history.indexOf(w);

  const edit = () => {
    if (data.active && !confirm('A workout is in progress. Replace it with this one for editing?')) return;
    update((d) => {
      d.active = { ...structuredClone(w), editingId: w.id, restEndsAt: null };
    });
    nav('/workout');
  };

  const repeat = () => {
    const r: Routine = routineFromWorkout(w);
    start({ ...r, id: w.routineId ?? '', name: w.name });
  };

  return (
    <div className="page">
      <header className="page-head">
        <button className="btn ghost small" onClick={() => nav('/history')}>
          ← History
        </button>
        <Menu
          items={[
            { label: 'Edit workout', onClick: edit },
            { label: 'Repeat workout', onClick: repeat },
            {
              label: 'Save as routine',
              onClick: () => {
                const r = routineFromWorkout(w);
                update((d) => void d.routines.push(r));
                nav('/routine/' + r.id);
              },
            },
            {
              label: 'Delete workout',
              danger: true,
              onClick: () => {
                if (!confirm('Delete this workout permanently?')) return;
                update((d) => void (d.workouts = d.workouts.filter((x) => x.id !== w.id)));
                nav('/history');
              },
            },
          ]}
        />
      </header>

      {justFinished && (
        <div className="card congrats">
          <h2>🎉 Workout complete!</h2>
          <p>
            That was workout #{workoutIndex}.{' '}
            {prs.length ? `You set ${prs.length} personal record${prs.length > 1 ? 's' : ''}!` : 'Keep it up!'}
          </p>
        </div>
      )}

      <h1 className="detail-title">{w.name}</h1>
      <p className="muted">
        {fmtDate(w.startedAt)} · {fmtTime(w.startedAt)}
      </p>

      <div className="stats">
        <Stat label="Duration" value={fmtDuration((w.endedAt ?? w.startedAt) - w.startedAt)} />
        <Stat label="Volume" value={fmtVolume(workoutVolume(w), unit)} />
        <Stat label="Sets" value={workoutSetCount(w)} />
        <Stat label="PRs" value={prs.length} />
      </div>

      {w.notes && <p className="note-box">{w.notes}</p>}

      {prs.length > 0 && (
        <div className="card">
          <h3>🏆 Personal records</h3>
          <ul className="pr-list">
            {prs.map((p, i) => {
              const e = exMap.get(p.exerciseId);
              return (
                <li key={i}>
                  <span>{e ? exerciseLabel(e) : '?'}</span>
                  <span className="muted">{prLabel(p.kind, e)}</span>
                  <strong>
                    {p.kind === 'reps' ? (e?.kind === 'duration' ? fmtClock(p.value) : `${p.value} reps`) : fmtWeight(p.value, unit)}
                  </strong>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {w.exercises.map((ex) => {
        const e = exMap.get(ex.exerciseId);
        let n = 0;
        return (
          <div key={ex.id} className="card">
            <button className="ex-name" onClick={() => nav('/exercises/' + ex.exerciseId)}>
              {e ? exerciseLabel(e) : 'Unknown exercise'}
            </button>
            {ex.notes && <p className="muted small">{ex.notes}</p>}
            <div className="set-list">
              <div className="set-line head">
                <span>Set</span>
                <span>{e?.kind === 'duration' ? 'Time' : 'Weight × reps'}</span>
                <span>{e?.kind === 'duration' ? '' : 'Est. 1RM'}</span>
              </div>
              {ex.sets.map((s) => {
                if (s.type !== 'warmup') n++;
                const isPr = prs.some((p) => p.setId === s.id);
                return (
                  <div key={s.id} className="set-line">
                    <span className={`set-type t-${s.type}`}>
                      {s.type === 'warmup' ? 'W' : s.type === 'drop' ? 'D' : s.type === 'failure' ? 'F' : n}
                    </span>
                    <span>
                      {fmtSetValue(s, e?.kind, unit)}
                      {isPr && <span className="badge pr small">PR</span>}
                    </span>
                    <span className="muted">
                      {e?.kind !== 'duration' && s.weight && s.reps ? fmtWeight(e1rm(s.weight, s.reps), unit, 0) : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
