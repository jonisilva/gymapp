import type { Unit, Workout, WorkoutSet } from './types';

export const KG_PER_LB = 0.45359237;

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const round = (v: number, d = 1) => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

export const toDisplay = (kg: number, unit: Unit) => (unit === 'kg' ? kg : kg / KG_PER_LB);
export const fromDisplay = (v: number, unit: Unit) => (unit === 'kg' ? v : v * KG_PER_LB);

export const fmtWeight = (kg: number, unit: Unit, digits = 1) => `${round(toDisplay(kg, unit), digits)} ${unit}`;

export const fmtNumber = (n: number) => Math.round(n).toLocaleString();

export const fmtVolume = (kg: number, unit: Unit) => `${fmtNumber(toDisplay(kg, unit))} ${unit}`;

/** Epley estimated one-rep max */
export const e1rm = (weight: number, reps: number) => {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
};

export const fmtDuration = (ms: number) => {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};

export const fmtClock = (sec: number) => {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? h + ':' : ''}${mm}:${String(s).padStart(2, '0')}`;
};

/** Parse "45", "0:45", "7:00" or "1:02:00" into seconds (plain numbers are seconds). */
export const parseTime = (t: string): number | null => {
  t = t.trim();
  if (!t) return null;
  if (!/^\d+(:\d{1,2}){0,2}$/.test(t)) return null;
  return t.split(':').reduce((acc, p) => acc * 60 + Number(p), 0);
};

export const fmtRest = (sec: number | null) => {
  if (!sec) return 'Off';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
};

export const REST_OPTIONS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];

export const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

export const fmtShortDate = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

export const workingSets = (sets: WorkoutSet[]) => sets.filter((s) => s.done && s.type !== 'warmup');

export const workoutVolume = (w: Workout) =>
  w.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + (set.done ? (set.weight ?? 0) * (set.reps ?? 0) : 0), 0),
    0,
  );

export const workoutSetCount = (w: Workout) =>
  w.exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.done).length, 0);

export const weekStart = (ts: number) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
};

export const defaultWorkoutName = (ts = Date.now()) => {
  const h = new Date(ts).getHours();
  if (h < 5) return 'Night Workout';
  if (h < 12) return 'Morning Workout';
  if (h < 17) return 'Afternoon Workout';
  if (h < 21) return 'Evening Workout';
  return 'Night Workout';
};

export const downloadFile = (name: string, content: string, type = 'application/json') => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Human-readable set value, e.g. "60 kg × 8", "12 reps", "0:45". */
export const fmtSetValue = (
  s: { weight: number | null; reps: number | null },
  kind: 'weighted' | 'bodyweight' | 'duration' | undefined,
  unit: Unit,
) => {
  if (kind === 'duration') return fmtClock(s.reps ?? 0);
  if (kind === 'bodyweight' && !s.weight) return `${s.reps ?? 0} reps`;
  return `${round(toDisplay(s.weight ?? 0, unit), 2)} ${unit} × ${s.reps ?? 0}`;
};
