export type Unit = 'kg' | 'lb';
export type ThemePref = 'system' | 'light' | 'dark';
export type SetType = 'normal' | 'warmup' | 'drop' | 'failure';
export type ExerciseKind = 'weighted' | 'bodyweight' | 'duration';

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  equipment: string;
  kind: ExerciseKind;
  custom?: boolean;
}

export interface WorkoutSet {
  id: string;
  type: SetType;
  /** Always stored in kg (added weight for bodyweight exercises). */
  weight: number | null;
  /** Reps, or seconds for duration exercises. */
  reps: number | null;
  done: boolean;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  notes: string;
  restSec: number | null;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  name: string;
  routineId?: string;
  startedAt: number;
  endedAt?: number;
  notes: string;
  exercises: WorkoutExercise[];
}

export interface ActiveWorkout extends Workout {
  restEndsAt?: number | null;
  restTotal?: number;
  /** When editing an already-finished workout. */
  editingId?: string;
}

export interface RoutineExercise {
  exerciseId: string;
  sets: number;
  reps: string;
  restSec: number | null;
  notes?: string;
}

export interface Routine {
  id: string;
  name: string;
  notes?: string;
  exercises: RoutineExercise[];
}

export interface BodyWeight {
  id: string;
  date: number;
  kg: number;
}

export interface Settings {
  unit: Unit;
  defaultRest: number;
  sound: boolean;
  theme: ThemePref;
}

export interface AppData {
  version: 1;
  /** Custom exercises only; built-ins live in exercises.ts */
  exercises: Exercise[];
  routines: Routine[];
  workouts: Workout[];
  active: ActiveWorkout | null;
  bodyweight: BodyWeight[];
  settings: Settings;
}
