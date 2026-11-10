import type { Exercise, Workout, WorkoutSet } from './types';
import { e1rm, weekStart, workingSets } from './utils';

export type PRKind = 'e1rm' | 'weight' | 'volume' | 'reps';

export const PR_LABEL: Record<PRKind, string> = {
  e1rm: 'Est. 1RM',
  weight: 'Heaviest weight',
  volume: 'Best set volume',
  reps: 'Most reps',
};

export const prLabel = (kind: PRKind, ex: Exercise | undefined) =>
  kind === 'reps' && ex?.kind === 'duration' ? 'Longest time' : PR_LABEL[kind];

export interface PR {
  exerciseId: string;
  kind: PRKind;
  value: number;
  setId: string;
}

interface Bests {
  e1rm: number;
  weight: number;
  volume: number;
  reps: number;
}

const setScores = (s: WorkoutSet): Bests => {
  const w = s.weight ?? 0;
  const r = s.reps ?? 0;
  return { e1rm: e1rm(w, r), weight: w, volume: w * r, reps: r };
};

const kindsFor = (ex: Exercise | undefined): PRKind[] =>
  ex?.kind === 'duration' ? ['reps'] : ex?.kind === 'bodyweight' ? ['reps', 'weight'] : ['e1rm', 'weight', 'volume'];

/** Map of workoutId -> PRs set in that workout (only counted once an exercise has prior history). */
export function computePRs(workouts: Workout[], exMap: Map<string, Exercise>): Map<string, PR[]> {
  const sorted = [...workouts].sort((a, b) => a.startedAt - b.startedAt);
  const bests = new Map<string, Bests>();
  const out = new Map<string, PR[]>();
  for (const w of sorted) {
    const prs: PR[] = [];
    for (const ex of w.exercises) {
      const sets = workingSets(ex.sets);
      if (!sets.length) continue;
      const prev = bests.get(ex.exerciseId);
      const kinds = kindsFor(exMap.get(ex.exerciseId));
      const cur: Bests = prev ? { ...prev } : { e1rm: 0, weight: 0, volume: 0, reps: 0 };
      for (const kind of kinds) {
        let bestSet: WorkoutSet | null = null;
        let bestVal = 0;
        for (const s of sets) {
          const v = setScores(s)[kind];
          if (v > bestVal) {
            bestVal = v;
            bestSet = s;
          }
        }
        if (bestSet && bestVal > cur[kind]) {
          if (prev && bestVal > 0) prs.push({ exerciseId: ex.exerciseId, kind, value: bestVal, setId: bestSet.id });
          cur[kind] = bestVal;
        }
      }
      bests.set(ex.exerciseId, cur);
    }
    out.set(w.id, prs);
  }
  return out;
}

export interface ExerciseSession {
  workoutId: string;
  workoutName: string;
  date: number;
  sets: WorkoutSet[];
  bestE1rm: number;
  heaviest: number;
  volume: number;
  bestReps: number;
  totalReps: number;
}

/** Sessions of an exercise in chronological order. */
export function exerciseSessions(workouts: Workout[], exerciseId: string): ExerciseSession[] {
  const out: ExerciseSession[] = [];
  for (const w of workouts) {
    for (const ex of w.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      const sets = ex.sets.filter((s) => s.done);
      const work = workingSets(sets);
      if (!sets.length) continue;
      out.push({
        workoutId: w.id,
        workoutName: w.name,
        date: w.startedAt,
        sets,
        bestE1rm: Math.max(0, ...work.map((s) => e1rm(s.weight ?? 0, s.reps ?? 0))),
        heaviest: Math.max(0, ...work.map((s) => s.weight ?? 0)),
        volume: work.reduce((n, s) => n + (s.weight ?? 0) * (s.reps ?? 0), 0),
        bestReps: Math.max(0, ...work.map((s) => s.reps ?? 0)),
        totalReps: work.reduce((n, s) => n + (s.reps ?? 0), 0),
      });
    }
  }
  return out.sort((a, b) => a.date - b.date);
}

/** Last completed sets for each exercise (from most recent workout containing it). */
export function lastSetsByExercise(history: Workout[], excludeId?: string): Map<string, WorkoutSet[]> {
  const map = new Map<string, WorkoutSet[]>();
  for (const w of history) {
    if (w.id === excludeId) continue;
    for (const ex of w.exercises) {
      if (map.has(ex.exerciseId)) continue;
      const sets = ex.sets.filter((s) => s.done);
      if (sets.length) map.set(ex.exerciseId, sets);
    }
  }
  return map;
}

export function weeklyCounts(workouts: Workout[], weeks: number) {
  const now = weekStart(Date.now());
  const WEEK = 7 * 86400000;
  const buckets = Array.from({ length: weeks }, (_, i) => ({ start: now - (weeks - 1 - i) * WEEK, count: 0 }));
  for (const w of workouts) {
    const ws = weekStart(w.startedAt);
    const b = buckets.find((x) => Math.abs(x.start - ws) < 86400000);
    if (b) b.count++;
  }
  return buckets;
}

export function weekStreak(workouts: Workout[]) {
  const weeks = new Set(workouts.map((w) => new Date(weekStart(w.startedAt)).toDateString()));
  const d = new Date(weekStart(Date.now()));
  let streak = 0;
  // Current week counts if it has a workout; otherwise start from last week.
  if (!weeks.has(d.toDateString())) d.setDate(d.getDate() - 7);
  while (weeks.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 7);
  }
  return streak;
}
