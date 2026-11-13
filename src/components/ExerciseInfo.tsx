import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { exerciseLabel } from '../exercises';
import type { Exercise } from '../types';
import { Modal } from './ui';

const STOP = new Set(['the', 'a', 'of', 'with', 'and', 'on', 'to', 'up']);
const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));

/** Search phrase for an exercise, e.g. "Bench Press dumbbell". */
function searchTerm(e: Exercise) {
  const eq = ['Bodyweight', 'Other', 'Machine'].includes(e.equipment) || e.muscle === 'Cardio' ? '' : ` ${e.equipment}`;
  return `${e.name}${eq}`.trim();
}

export function mediaLinks(e: Exercise) {
  const q = searchTerm(e);
  const enc = (s: string) => encodeURIComponent(s);
  return [
    {
      icon: '🎞',
      label: 'Animated GIFs',
      hint: 'Google Images, animated only',
      url: `https://www.google.com/search?tbm=isch&tbs=itp:animated&q=${enc(q + ' exercise gif')}`,
    },
    {
      icon: '▶',
      label: 'Short videos',
      hint: 'YouTube Shorts, under a minute',
      url: `https://www.youtube.com/results?search_query=${enc(q + ' form #shorts')}`,
    },
    {
      icon: '🎓',
      label: 'Full tutorials',
      hint: 'YouTube, technique breakdowns',
      url: `https://www.youtube.com/results?search_query=${enc('how to ' + q + ' proper form')}`,
    },
  ];
}

/** Movement patterns, matched against the lower-cased exercise name. Same pattern = good substitute. */
const PATTERNS: [string, RegExp][] = [
  ['vertical-pull', /pulldown|pull ?up|chin ?up/],
  ['horizontal-pull', /\brow\b|t-bar/],
  ['horizontal-press', /bench press|chest press|push ?up|chest dip|floor press/],
  ['fly', /\bfly\b|crossover|pec deck/],
  ['vertical-press', /overhead press|shoulder press|arnold|military|push press/],
  ['lateral', /lateral raise|upright row/],
  ['rear-delt', /rear delt|face pull|reverse fly/],
  ['curl', /(bicep|hammer|preacher|incline|ez bar|concentration|spider|drag) curl/],
  ['triceps', /triceps|skullcrusher|close grip/],
  ['squat', /squat|leg press|hack/],
  ['knee-ext', /leg extension/],
  ['lunge', /lunge|split squat|step ?up/],
  ['hinge', /deadlift|good morning|back extension|hip hinge/],
  ['leg-curl', /leg curl|nordic/],
  ['hip-ext', /hip thrust|glute bridge|kickback/],
  ['abduction', /abduction|clamshell/],
  ['calf', /calf/],
  ['anti-ext', /plank|dead bug|ab wheel|rollout|hollow/],
  ['flexion', /crunch|leg raise|sit ?up/],
  ['rotation', /twist|pallof|woodchop|side plank/],
  ['carry', /farmer|carry/],
  ['olympic', /clean|snatch|jerk|swing/],
  ['cardio', /bike|treadmill|trainer|rowing machine|elliptical|stair/],
];
const patternsOf = (name: string) => {
  const n = name.toLowerCase();
  return PATTERNS.filter(([, re]) => re.test(n)).map(([p]) => p);
};

/** Similar exercises: same movement with other equipment first, then same pattern, then same muscle. */
export function alternativesFor(e: Exercise, all: Exercise[], limit = 8) {
  const base = words(e.name);
  const pats = patternsOf(e.name);
  const scored: { ex: Exercise; score: number }[] = [];
  for (const x of all) {
    if (x.id === e.id) continue;
    const sameName = x.name.toLowerCase() === e.name.toLowerCase();
    const samePattern = patternsOf(x.name).some((p) => pats.includes(p));
    if (!sameName && !samePattern && x.muscle !== e.muscle) continue;
    const shared = words(x.name).filter((w) => base.includes(w)).length;
    let score =
      (sameName ? 100 : 0) +
      (samePattern ? 50 : 0) +
      (x.muscle === e.muscle ? 15 : 0) +
      shared * 8 +
      (x.kind === e.kind ? 3 : 0) +
      (x.custom ? -1 : 0);
    if (x.equipment !== e.equipment) score += 1; // gentle preference for a different setup
    scored.push({ ex: x, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.ex.name.localeCompare(b.ex.name))
    .slice(0, limit)
    .map((s) => s.ex);
}

export function InfoButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      className="info-btn"
      aria-label={`How to do ${label}: videos, GIFs and alternatives`}
      title="Videos, GIFs & alternatives"
      onClick={(ev) => {
        ev.stopPropagation();
        onClick();
      }}
    >
      i
    </button>
  );
}

export function ExerciseInfo({
  exerciseId,
  onClose,
  onSwap,
}: {
  exerciseId: string;
  onClose: () => void;
  /** When given, each alternative gets a button to swap it in. */
  onSwap?: (id: string) => void;
}) {
  const { exMap, exercises } = useStore();
  const [trail, setTrail] = useState<string[]>([exerciseId]);
  const current = exMap.get(trail[trail.length - 1]);
  const alts = useMemo(() => (current ? alternativesFor(current, exercises) : []), [current, exercises]);
  if (!current) return null;
  const isOriginal = trail.length === 1;

  return (
    <Modal title={exerciseLabel(current)} onClose={onClose}>
      {!isOriginal && (
        <button className="btn ghost small info-back" onClick={() => setTrail((t) => t.slice(0, -1))}>
          ← Back to {exMap.get(trail[trail.length - 2])?.name}
        </button>
      )}
      <p className="muted small">
        {current.muscle} · {current.equipment}
        {current.custom ? ' · Custom' : ''}
      </p>

      <section className="info-section">
        <h3>Watch how it's done</h3>
        <div className="media-links">
          {mediaLinks(current).map((l) => (
            <a key={l.label} className="media-link" href={l.url} target="_blank" rel="noopener noreferrer">
              <span className="media-icon" aria-hidden>
                {l.icon}
              </span>
              <span className="media-text">
                <strong>{l.label}</strong>
                <small>{l.hint}</small>
              </span>
              <span className="media-go" aria-hidden>
                ↗
              </span>
            </a>
          ))}
        </div>
        <p className="muted tiny">Opens a search in a new tab.</p>
      </section>

      {!isOriginal && onSwap && (
        <button
          className="btn primary block"
          onClick={() => {
            onSwap(current.id);
            onClose();
          }}
        >
          Swap to {exerciseLabel(current)}
        </button>
      )}

      <section className="info-section">
        <h3>Alternatives</h3>
        {!alts.length && <p className="muted small">No similar exercises found.</p>}
        <ul className="alt-list">
          {alts.map((x) => (
            <li key={x.id}>
              <button className="alt-name" onClick={() => setTrail((t) => [...t, x.id])}>
                <strong>{exerciseLabel(x)}</strong>
                <small>
                  {x.muscle} · {x.equipment}
                </small>
              </button>
              <a
                className="icon-btn"
                href={mediaLinks(x)[1].url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Videos of ${exerciseLabel(x)}`}
                title="Short videos"
              >
                ▶
              </a>
              {onSwap && (
                <button
                  className="btn small ghost"
                  onClick={() => {
                    onSwap(x.id);
                    onClose();
                  }}
                >
                  Swap
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </Modal>
  );
}
