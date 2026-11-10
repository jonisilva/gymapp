import type { Exercise, ExerciseKind, Routine, RoutineExercise } from './types';
import { exerciseLabel } from './exercises';
import { parseTime, uid } from './utils';

/** Minimal RFC-4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  text = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const EQUIP_WORDS: [RegExp, string][] = [
  [/\bdumbbells?\b|\bdb\b/, 'Dumbbell'],
  [/\bbarbell\b/, 'Barbell'],
  [/\bcable\b/, 'Cable'],
  [/\bmachine\b/, 'Machine'],
  [/\bkettlebell\b/, 'Kettlebell'],
  [/\bband(ed)?\b/, 'Band'],
  [/\bsmith\b/, 'Smith Machine'],
];

const ALIASES: Record<string, string> = {
  bike: 'stationary-bike-machine',
  'exercise bike': 'stationary-bike-machine',
  'cross-trainer': 'cross-trainer-machine',
  elliptical: 'cross-trainer-machine',
  rdl: 'romanian-deadlift-barbell',
  'dumbbell rdl': 'romanian-deadlift-dumbbell',
  'hip abduction': 'hip-abduction-machine',
  'cable hip abduction': 'hip-abduction-cable',
  'standing cable hip abduction': 'hip-abduction-cable',
  'pulldown': 'lat-pulldown-cable',
};

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' ').trim();

function guessMuscle(name: string): string {
  const n = name.toLowerCase();
  const rules: [RegExp, string][] = [
    [/bike|cardio|run|treadmill|row(ing)? machine|cross|elliptical|walk|swim|zone/, 'Cardio'],
    [/plank|crunch|ab\b|abs|core|pallof|dead bug|twist/, 'Abs'],
    [/squat|leg press|leg extension|lunge|wall sit|step.?up|quad/, 'Quads'],
    [/curl.*leg|leg curl|hamstring|rdl|romanian|good morning/, 'Hamstrings'],
    [/glute|hip thrust|bridge|abduct|kickback/, 'Glutes'],
    [/calf/, 'Calves'],
    [/bench|chest|fly|push.?up|pec/, 'Chest'],
    [/row|pulldown|pull.?up|chin|deadlift|back/, 'Back'],
    [/shoulder|overhead|lateral|delt|raise|face pull/, 'Shoulders'],
    [/tricep|pushdown|skull|dip/, 'Triceps'],
    [/bicep|curl/, 'Biceps'],
  ];
  return rules.find(([r]) => r.test(n))?.[1] ?? 'Full Body';
}

export interface ImportMatch {
  source: string;
  exerciseId: string;
  label: string;
  created: boolean;
}

export interface PlanImport {
  routines: Routine[];
  newExercises: Exercise[];
  matches: ImportMatch[];
}

/**
 * Import a workout plan CSV: one row per exercise, grouped by a "Workout" column.
 * Recognised columns (case-insensitive): Workout, Order, Step, Exercise, Sets,
 * Target per set / Target / Reps, Rest between sets / Rest, Notes.
 */
export function importPlanCsv(text: string, exercises: Exercise[]): PlanImport {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('The file has no data rows.');
  const head = rows[0].map((h) => norm(h));
  const col = (...names: string[]) => head.findIndex((h) => names.includes(h));
  const cWorkout = col('workout', 'routine', 'workout name', 'day');
  const cExercise = col('exercise', 'exercise name');
  if (cWorkout < 0 || cExercise < 0) throw new Error('Expected "Workout" and "Exercise" columns.');
  const cOrder = col('order', '#');
  const cStep = col('step', 'type', 'phase');
  const cSets = col('sets');
  const cTarget = col('target per set', 'target', 'reps', 'target reps');
  const cRest = col('rest between sets', 'rest', 'rest (s)');
  const cNotes = col('notes', 'note', 'comments');

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const newExercises: Exercise[] = [];
  const matches: ImportMatch[] = [];

  const resolve = (raw: string, timed: boolean): Exercise => {
    // "Cross-trainer or bike (zone 2)" -> "cross-trainer"; strip parentheticals.
    let n = norm(raw.replace(/\(.*?\)/g, '')).split(/\s+or\s+/)[0].trim();
    const all = [...exercises, ...newExercises];
    if (ALIASES[n] && byId.has(ALIASES[n])) return byId.get(ALIASES[n])!;
    let equipment = '';
    for (const [re, eq] of EQUIP_WORDS) if (re.test(n)) equipment = eq;
    // Exact full-name match first ("Seated Cable Row" is its own exercise).
    const exact = all.filter((e) => norm(e.name) === n);
    const exactPick = exact.find((e) => equipment && e.equipment === equipment) ?? exact[0];
    if (exactPick) return exactPick;
    for (const [re] of EQUIP_WORDS) n = n.replace(re, '').replace(/\s+/g, ' ').trim();
    if (ALIASES[n] && byId.has(ALIASES[n])) return byId.get(ALIASES[n])!;
    const candidates = all.filter((e) => norm(e.name) === n || norm(e.name) === norm(raw));
    const pick =
      candidates.find((e) => equipment && e.equipment === equipment) ??
      candidates.find((e) => !equipment) ??
      candidates[0];
    if (pick) return pick;
    // Drop leading posture words: "seated dumbbell shoulder press" -> "shoulder press"
    const stripped = n.replace(/^(seated|standing|lying|incline|flat)\s+/, '');
    if (stripped !== n) {
      const c2 = all.filter((e) => norm(e.name) === stripped);
      const p2 = c2.find((e) => equipment && e.equipment === equipment) ?? c2[0];
      if (p2) return p2;
    }
    const name = raw.replace(/\s+/g, ' ').trim();
    const kind: ExerciseKind = timed ? 'duration' : /plank|hold|isometric/i.test(raw) ? 'duration' : 'weighted';
    const ex: Exercise = {
      id: 'custom-' + slug(name) + '-' + uid().slice(0, 6),
      name,
      muscle: guessMuscle(name),
      equipment: equipment || 'Other',
      kind,
      custom: true,
    };
    newExercises.push(ex);
    return ex;
  };

  const groups = new Map<string, { order: number; ex: RoutineExercise }[]>();
  rows.slice(1).forEach((r, i) => {
    const get = (c: number) => (c >= 0 ? (r[c] ?? '').trim() : '');
    const workout = get(cWorkout);
    const exName = get(cExercise);
    if (!workout || !exName) return;
    const target = get(cTarget);
    const timeTarget = /^\d+:\d{2}(:\d{2})?$/.test(target) ? target : '';
    const repsTarget = target.match(/^(\d+(\s*-\s*\d+)?)/)?.[1] ?? '';
    const ex = resolve(exName, !!timeTarget);
    const step = get(cStep);
    const isWarmCool = /warm|cool/i.test(step);
    const restRaw = get(cRest);
    const rest = parseTime(restRaw);
    const sets = parseInt(get(cSets), 10);
    const extra = [
      step && !/^exercise$/i.test(step) ? step : '',
      ex.kind !== 'duration' && /\(([^)]+)\)/.test(exName) ? exName.match(/\(([^)]+)\)/)![1] : '',
      get(cNotes),
    ].filter(Boolean);

    if (!matches.some((m) => m.source === exName))
      matches.push({
        source: exName,
        exerciseId: ex.id,
        label: exerciseLabel(ex),
        created: newExercises.includes(ex),
      });

    if (!groups.has(workout)) groups.set(workout, []);
    groups.get(workout)!.push({
      order: cOrder >= 0 && get(cOrder) ? Number(get(cOrder)) : i,
      ex: {
        exerciseId: ex.id,
        sets: Number.isFinite(sets) && sets > 0 ? Math.min(sets, 20) : 1,
        reps: timeTarget || repsTarget || (target && ex.kind !== 'duration' ? target : ''),
        restSec: rest ?? (isWarmCool ? 0 : null),
        notes: extra.join(' · '),
      },
    });
  });

  const routines: Routine[] = [...groups.entries()].map(([name, list]) => ({
    id: uid(),
    name,
    exercises: list.sort((a, b) => a.order - b.order).map((x) => x.ex),
  }));
  return { routines, newExercises, matches };
}
