import type { Exercise, ExerciseKind } from './types';

export const MUSCLES = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs', 'Full Body', 'Cardio',
];

export const EQUIPMENT = [
  'Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Kettlebell', 'Band', 'Smith Machine', 'Other',
];

type Row = [string, string, string, ExerciseKind?];

const rows: Row[] = [
  // Chest
  ['Bench Press', 'Chest', 'Barbell'],
  ['Incline Bench Press', 'Chest', 'Barbell'],
  ['Decline Bench Press', 'Chest', 'Barbell'],
  ['Bench Press', 'Chest', 'Dumbbell'],
  ['Incline Bench Press', 'Chest', 'Dumbbell'],
  ['Chest Fly', 'Chest', 'Dumbbell'],
  ['Cable Crossover', 'Chest', 'Cable'],
  ['Chest Press', 'Chest', 'Machine'],
  ['Pec Deck', 'Chest', 'Machine'],
  ['Push Up', 'Chest', 'Bodyweight', 'bodyweight'],
  ['Chest Dip', 'Chest', 'Bodyweight', 'bodyweight'],
  // Back
  ['Deadlift', 'Back', 'Barbell'],
  ['Bent Over Row', 'Back', 'Barbell'],
  ['Pendlay Row', 'Back', 'Barbell'],
  ['T-Bar Row', 'Back', 'Barbell'],
  ['Single Arm Row', 'Back', 'Dumbbell'],
  ['Lat Pulldown', 'Back', 'Cable'],
  ['Seated Cable Row', 'Back', 'Cable'],
  ['Straight Arm Pulldown', 'Back', 'Cable'],
  ['Pull Up', 'Back', 'Bodyweight', 'bodyweight'],
  ['Chin Up', 'Back', 'Bodyweight', 'bodyweight'],
  ['Seated Row', 'Back', 'Machine'],
  ['Back Extension', 'Back', 'Bodyweight', 'bodyweight'],
  ['Shrug', 'Back', 'Dumbbell'],
  // Shoulders
  ['Overhead Press', 'Shoulders', 'Barbell'],
  ['Shoulder Press', 'Shoulders', 'Dumbbell'],
  ['Arnold Press', 'Shoulders', 'Dumbbell'],
  ['Lateral Raise', 'Shoulders', 'Dumbbell'],
  ['Lateral Raise', 'Shoulders', 'Cable'],
  ['Front Raise', 'Shoulders', 'Dumbbell'],
  ['Rear Delt Fly', 'Shoulders', 'Dumbbell'],
  ['Face Pull', 'Shoulders', 'Cable'],
  ['Shoulder Press', 'Shoulders', 'Machine'],
  ['Upright Row', 'Shoulders', 'Barbell'],
  // Biceps
  ['Bicep Curl', 'Biceps', 'Barbell'],
  ['Bicep Curl', 'Biceps', 'Dumbbell'],
  ['Hammer Curl', 'Biceps', 'Dumbbell'],
  ['Preacher Curl', 'Biceps', 'Machine'],
  ['Incline Curl', 'Biceps', 'Dumbbell'],
  ['Bicep Curl', 'Biceps', 'Cable'],
  ['EZ Bar Curl', 'Biceps', 'Barbell'],
  // Triceps
  ['Triceps Pushdown', 'Triceps', 'Cable'],
  ['Overhead Triceps Extension', 'Triceps', 'Cable'],
  ['Skullcrusher', 'Triceps', 'Barbell'],
  ['Close Grip Bench Press', 'Triceps', 'Barbell'],
  ['Triceps Dip', 'Triceps', 'Bodyweight', 'bodyweight'],
  ['Triceps Kickback', 'Triceps', 'Dumbbell'],
  // Forearms
  ['Wrist Curl', 'Forearms', 'Dumbbell'],
  ["Farmer's Walk", 'Forearms', 'Dumbbell'],
  // Quads
  ['Squat', 'Quads', 'Barbell'],
  ['Front Squat', 'Quads', 'Barbell'],
  ['Leg Press', 'Quads', 'Machine'],
  ['Leg Extension', 'Quads', 'Machine'],
  ['Hack Squat', 'Quads', 'Machine'],
  ['Bulgarian Split Squat', 'Quads', 'Dumbbell'],
  ['Goblet Squat', 'Quads', 'Dumbbell'],
  ['Lunge', 'Quads', 'Dumbbell'],
  ['Squat', 'Quads', 'Smith Machine'],
  ['Wall Sit', 'Quads', 'Bodyweight', 'duration'],
  ['Spanish Squat', 'Quads', 'Band', 'duration'],
  ['Leg Extension Hold', 'Quads', 'Machine', 'duration'],
  // Hamstrings
  ['Romanian Deadlift', 'Hamstrings', 'Barbell'],
  ['Romanian Deadlift', 'Hamstrings', 'Dumbbell'],
  ['Lying Leg Curl', 'Hamstrings', 'Machine'],
  ['Seated Leg Curl', 'Hamstrings', 'Machine'],
  ['Good Morning', 'Hamstrings', 'Barbell'],
  // Glutes
  ['Hip Thrust', 'Glutes', 'Barbell'],
  ['Glute Bridge', 'Glutes', 'Bodyweight', 'bodyweight'],
  ['Hip Abduction', 'Glutes', 'Machine'],
  ['Cable Kickback', 'Glutes', 'Cable'],
  ['Hip Abduction', 'Glutes', 'Cable'],
  // Calves
  ['Standing Calf Raise', 'Calves', 'Machine'],
  ['Seated Calf Raise', 'Calves', 'Machine'],
  // Abs
  ['Crunch', 'Abs', 'Bodyweight', 'bodyweight'],
  ['Hanging Leg Raise', 'Abs', 'Bodyweight', 'bodyweight'],
  ['Cable Crunch', 'Abs', 'Cable'],
  ['Ab Wheel Rollout', 'Abs', 'Other', 'bodyweight'],
  ['Russian Twist', 'Abs', 'Bodyweight', 'bodyweight'],
  ['Plank', 'Abs', 'Bodyweight', 'duration'],
  ['Side Plank', 'Abs', 'Bodyweight', 'duration'],
  ['Pallof Press', 'Abs', 'Cable'],
  ['Dead Bug', 'Abs', 'Bodyweight', 'bodyweight'],
  // Full body
  ['Kettlebell Swing', 'Full Body', 'Kettlebell'],
  ['Clean and Jerk', 'Full Body', 'Barbell'],
  ['Power Clean', 'Full Body', 'Barbell'],
  ['Burpee', 'Full Body', 'Bodyweight', 'bodyweight'],
  // Cardio
  ['Stationary Bike', 'Cardio', 'Machine', 'duration'],
  ['Cross Trainer', 'Cardio', 'Machine', 'duration'],
  ['Treadmill', 'Cardio', 'Machine', 'duration'],
  ['Rowing Machine', 'Cardio', 'Machine', 'duration'],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const BUILTIN_EXERCISES: Exercise[] = rows.map(([name, muscle, equipment, kind]) => ({
  id: `${slug(name)}-${slug(equipment)}`,
  name,
  muscle,
  equipment,
  kind: kind ?? 'weighted',
}));

export const exerciseLabel = (e: Exercise) =>
  e.equipment === 'Bodyweight' || e.equipment === 'Other' || e.muscle === 'Cardio'
    ? e.name
    : `${e.name} (${e.equipment})`;
