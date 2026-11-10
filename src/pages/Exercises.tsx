import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { exerciseLabel } from '../exercises';
import { ExerciseForm, FilterBar, useExerciseFilter } from '../components/ExercisePicker';
import { nav } from '../components/ui';

export default function Exercises() {
  const { exercises, history } = useStore();
  const f = useExerciseFilter(exercises);
  const [creating, setCreating] = useState(false);
  const [onlyDone, setOnlyDone] = useState(false);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of history) for (const ex of w.exercises) m.set(ex.exerciseId, (m.get(ex.exerciseId) ?? 0) + 1);
    return m;
  }, [history]);

  const list = onlyDone ? f.list.filter((e) => counts.has(e.id)) : f.list;

  return (
    <div className="page">
      <header className="page-head">
        <h1>Exercises</h1>
        <button className="btn small ghost" onClick={() => setCreating(true)}>
          + Custom
        </button>
      </header>
      <FilterBar {...f} />
      <label className="toggle-line">
        <input type="checkbox" checked={onlyDone} onChange={(e) => setOnlyDone(e.target.checked)} />
        Only exercises I've done
      </label>
      <ul className="ex-list">
        {list.map((e) => (
          <li key={e.id}>
            <button className="ex-item" onClick={() => nav('/exercises/' + e.id)}>
              <span className="ex-avatar">{e.name[0]}</span>
              <span className="ex-text">
                <strong>{exerciseLabel(e)}</strong>
                <small>
                  {e.muscle}
                  {e.custom ? ' · Custom' : ''}
                </small>
              </span>
              {counts.get(e.id) ? <span className="muted small">{counts.get(e.id)}×</span> : null}
            </button>
          </li>
        ))}
        {!list.length && <li className="muted pad">No exercises match.</li>}
      </ul>
      {creating && <ExerciseForm initialName={f.q} onClose={() => setCreating(false)} onSaved={(e) => nav('/exercises/' + e.id)} />}
    </div>
  );
}
