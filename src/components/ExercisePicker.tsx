import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { EQUIPMENT, exerciseLabel, MUSCLES } from '../exercises';
import type { Exercise, ExerciseKind } from '../types';
import { uid } from '../utils';
import { Modal } from './ui';

export function useExerciseFilter(exercises: Exercise[]) {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState('');
  const list = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return exercises.filter(
      (e) =>
        (!muscle || e.muscle === muscle) &&
        terms.every((t) => `${e.name} ${e.equipment} ${e.muscle}`.toLowerCase().includes(t)),
    );
  }, [exercises, q, muscle]);
  return { q, setQ, muscle, setMuscle, list };
}

export function FilterBar({
  q,
  setQ,
  muscle,
  setMuscle,
}: {
  q: string;
  setQ: (s: string) => void;
  muscle: string;
  setMuscle: (s: string) => void;
}) {
  return (
    <div className="filter-bar">
      <input className="search" placeholder="Search exercises" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips">
        <button className={!muscle ? 'chip on' : 'chip'} onClick={() => setMuscle('')}>
          All
        </button>
        {MUSCLES.map((m) => (
          <button key={m} className={muscle === m ? 'chip on' : 'chip'} onClick={() => setMuscle(muscle === m ? '' : m)}>
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ExercisePicker({
  onClose,
  onPick,
  multi = true,
}: {
  onClose: () => void;
  onPick: (ids: string[]) => void;
  multi?: boolean;
}) {
  const { exercises } = useStore();
  const f = useExerciseFilter(exercises);
  const [picked, setPicked] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const toggle = (id: string) => {
    if (!multi) {
      onPick([id]);
      return;
    }
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  if (creating)
    return (
      <ExerciseForm
        initialName={f.q}
        onClose={() => setCreating(false)}
        onSaved={(ex) => {
          setCreating(false);
          if (multi) setPicked((p) => [...p, ex.id]);
          else onPick([ex.id]);
        }}
      />
    );

  return (
    <Modal
      title={multi ? 'Add exercises' : 'Choose exercise'}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={() => setCreating(true)}>
            + Custom
          </button>
          {multi && (
            <button className="btn primary" disabled={!picked.length} onClick={() => onPick(picked)}>
              Add {picked.length || ''}
            </button>
          )}
        </>
      }
    >
      <FilterBar {...f} />
      <ul className="ex-list">
        {f.list.map((e) => {
          const idx = picked.indexOf(e.id);
          return (
            <li key={e.id}>
              <button className={idx >= 0 ? 'ex-item picked' : 'ex-item'} onClick={() => toggle(e.id)}>
                <span className="ex-avatar">{e.name[0]}</span>
                <span className="ex-text">
                  <strong>{exerciseLabel(e)}</strong>
                  <small>{e.muscle}</small>
                </span>
                {idx >= 0 && <span className="pick-num">{idx + 1}</span>}
              </button>
            </li>
          );
        })}
        {!f.list.length && <li className="muted pad">No exercises found. Create a custom one.</li>}
      </ul>
    </Modal>
  );
}

export function ExerciseForm({
  onClose,
  onSaved,
  initialName = '',
}: {
  onClose: () => void;
  onSaved: (e: Exercise) => void;
  initialName?: string;
}) {
  const { update } = useStore();
  const [name, setName] = useState(initialName);
  const [muscle, setMuscle] = useState(MUSCLES[0]);
  const [equipment, setEquipment] = useState(EQUIPMENT[0]);
  const [kind, setKind] = useState<ExerciseKind>('weighted');

  const save = () => {
    const ex: Exercise = { id: 'custom-' + uid(), name: name.trim(), muscle, equipment, kind, custom: true };
    update((d) => {
      d.exercises.push(ex);
    });
    onSaved(ex);
  };

  return (
    <Modal
      title="New exercise"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={!name.trim()} onClick={save}>
            Save
          </button>
        </>
      }
    >
      <label className="field">
        <span>Name</span>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Landmine Press" />
      </label>
      <label className="field">
        <span>Primary muscle</span>
        <select value={muscle} onChange={(e) => setMuscle(e.target.value)}>
          {MUSCLES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Equipment</span>
        <select value={equipment} onChange={(e) => setEquipment(e.target.value)}>
          {EQUIPMENT.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      <div className="field">
        <span>Tracking</span>
        <div className="seg">
          <button className={kind === 'weighted' ? 'on' : ''} onClick={() => setKind('weighted')}>
            Weight × reps
          </button>
          <button className={kind === 'bodyweight' ? 'on' : ''} onClick={() => setKind('bodyweight')}>
            Reps only
          </button>
          <button className={kind === 'duration' ? 'on' : ''} onClick={() => setKind('duration')}>
            Time
          </button>
        </div>
      </div>
    </Modal>
  );
}
