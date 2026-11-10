import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { fmtClock } from '../utils';
import { useNow } from './ui';

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.25, 0.5].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = i === 2 ? 1320 : 880;
      g.gain.setValueAtTime(0.25, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.22);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* audio unavailable */
  }
  navigator.vibrate?.([200, 100, 200]);
}

export function RestTimer() {
  const { data, updateActive } = useStore();
  const now = useNow(250);
  const a = data.active;
  const endsAt = a?.restEndsAt ?? null;
  const fired = useRef<number | null>(null);

  const remaining = endsAt ? (endsAt - now) / 1000 : 0;

  useEffect(() => {
    if (endsAt && remaining <= 0 && fired.current !== endsAt) {
      fired.current = endsAt;
      if (data.settings.sound && remaining > -5) beep();
      updateActive((w) => {
        w.restEndsAt = null;
      });
    }
  }, [endsAt, remaining, data.settings.sound, updateActive]);

  if (!a || !endsAt || remaining <= 0) return null;
  const total = a.restTotal || 1;
  const adjust = (sec: number) =>
    updateActive((w) => {
      if (!w.restEndsAt) return;
      w.restEndsAt = Math.max(Date.now() + 1000, w.restEndsAt + sec * 1000);
      w.restTotal = Math.max(1, (w.restTotal ?? 0) + sec);
    });

  return (
    <div className="rest-bar" role="timer">
      <div className="rest-progress" style={{ width: `${Math.min(100, (remaining / total) * 100)}%` }} />
      <button className="btn small ghost" onClick={() => adjust(-15)}>
        −15
      </button>
      <div className="rest-time">
        <small>Rest</small>
        <strong>{fmtClock(Math.ceil(remaining))}</strong>
      </div>
      <button className="btn small ghost" onClick={() => adjust(15)}>
        +15
      </button>
      <button
        className="btn small primary"
        onClick={() =>
          updateActive((w) => {
            w.restEndsAt = null;
          })
        }
      >
        Skip
      </button>
    </div>
  );
}
