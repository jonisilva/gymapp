import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ActiveWorkout, AppData, Exercise, Routine, Settings, Workout } from './types';
import { BUILTIN_EXERCISES } from './exercises';
import { defaultWorkoutName, uid } from './utils';

const KEY = 'liftlog:v1';

const defaultSettings: Settings = { unit: 'kg', defaultRest: 90, sound: true };

export const emptyData = (): AppData => ({
  version: 1,
  exercises: [],
  routines: [],
  workouts: [],
  active: null,
  bodyweight: [],
  settings: { ...defaultSettings },
});

export const normalizeData = (d: Partial<AppData>): AppData => ({
  ...emptyData(),
  ...d,
  version: 1,
  settings: { ...defaultSettings, ...(d.settings ?? {}) },
});

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalizeData(JSON.parse(raw));
  } catch {
    /* ignore corrupt storage */
  }
  return emptyData();
}

interface StoreCtx {
  data: AppData;
  /** Mutate a deep copy of the whole state. Use for infrequent operations. */
  update: (fn: (d: AppData) => void) => void;
  /** Mutate a copy of the active workout only (cheap; used while logging). */
  updateActive: (fn: (a: ActiveWorkout) => void) => void;
  replaceAll: (d: AppData) => void;
  exercises: Exercise[];
  exMap: Map<string, Exercise>;
  /** Finished workouts, newest first */
  history: Workout[];
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save', e);
    }
  }, [data]);

  const update = useCallback((fn: (d: AppData) => void) => {
    setData((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);

  const updateActive = useCallback((fn: (a: ActiveWorkout) => void) => {
    setData((prev) => {
      if (!prev.active) return prev;
      const a = structuredClone(prev.active);
      fn(a);
      return { ...prev, active: a };
    });
  }, []);

  const exercises = useMemo(
    () => [...BUILTIN_EXERCISES, ...data.exercises].sort((a, b) => a.name.localeCompare(b.name)),
    [data.exercises],
  );
  const exMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const history = useMemo(
    () => [...data.workouts].sort((a, b) => b.startedAt - a.startedAt),
    [data.workouts],
  );

  const value = useMemo(
    () => ({ data, update, updateActive, replaceAll: setData, exercises, exMap, history }),
    [data, update, updateActive, exercises, exMap, history],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('StoreProvider missing');
  return c;
};

export function newWorkoutFromRoutine(routine: Routine | null): ActiveWorkout {
  return {
    id: uid(),
    name: routine?.name ?? defaultWorkoutName(),
    routineId: routine?.id || undefined,
    startedAt: Date.now(),
    notes: '',
    exercises: (routine?.exercises ?? []).map((re) => ({
      id: uid(),
      exerciseId: re.exerciseId,
      notes: [
        re.reps ? `Target: ${re.reps}${/^\d+(\s*-\s*\d+)?$/.test(re.reps.trim()) ? ' reps' : ''}` : '',
        re.notes ?? '',
      ]
        .filter(Boolean)
        .join(' · '),
      restSec: re.restSec,
      sets: Array.from({ length: Math.max(1, re.sets) }, () => ({
        id: uid(),
        type: 'normal' as const,
        weight: null,
        reps: null,
        done: false,
      })),
    })),
  };
}

export function routineFromWorkout(w: Workout): Routine {
  return {
    id: uid(),
    name: w.name,
    exercises: w.exercises.map((ex) => {
      const reps = ex.sets.filter((s) => s.type !== 'warmup').map((s) => s.reps ?? 0).filter(Boolean);
      const lo = Math.min(...reps);
      const hi = Math.max(...reps);
      return {
        exerciseId: ex.exerciseId,
        sets: ex.sets.length,
        reps: reps.length ? (lo === hi ? String(lo) : `${lo}-${hi}`) : '',
        restSec: ex.restSec,
      };
    }),
  };
}
