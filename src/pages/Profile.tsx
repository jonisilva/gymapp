import { useMemo, useRef, useState } from 'react';
import { emptyData, normalizeData, useStore } from '../store';
import { weeklyCounts, weekStreak } from '../stats';
import type { ThemePref, Unit } from '../types';
import {
  downloadFile,
  fmtDuration,
  fmtNumber,
  fmtRest,
  fmtShortDate,
  fmtWeight,
  fromDisplay,
  REST_OPTIONS,
  toDisplay,
  uid,
  workoutVolume,
} from '../utils';
import { BarChart, LineChart } from '../components/Charts';
import { NumInput, Stat } from '../components/ui';
import { importPlanCsv } from '../importPlan';
import { ThemeToggle } from '../components/ThemeToggle';

export default function Profile() {
  const { data, update, replaceAll, history, exMap, exercises } = useStore();
  const unit = data.settings.unit;
  const [bwInput, setBwInput] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  const totals = useMemo(() => {
    let vol = 0, time = 0, sets = 0;
    for (const w of history) {
      vol += workoutVolume(w);
      time += (w.endedAt ?? w.startedAt) - w.startedAt;
      sets += w.exercises.reduce((n, e) => n + e.sets.length, 0);
    }
    return { vol, time, sets };
  }, [history]);

  const weeks = useMemo(
    () =>
      weeklyCounts(history, 12).map((b) => ({
        label: new Date(b.start).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
        value: b.count,
      })),
    [history],
  );

  const muscles = useMemo(() => {
    const since = Date.now() - 30 * 86400000;
    const m = new Map<string, number>();
    for (const w of history) {
      if (w.startedAt < since) continue;
      for (const ex of w.exercises) {
        const muscle = exMap.get(ex.exerciseId)?.muscle ?? 'Other';
        m.set(muscle, (m.get(muscle) ?? 0) + ex.sets.filter((s) => s.type !== 'warmup').length);
      }
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [history, exMap]);
  const maxMuscle = Math.max(1, ...muscles.map((m) => m[1]));

  const bwSorted = [...data.bodyweight].sort((a, b) => a.date - b.date);
  const latestBw = bwSorted[bwSorted.length - 1];

  const exportData = () =>
    downloadFile(`liftlog-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));

  const exportCsv = () => {
    const rows = [['date', 'workout', 'exercise', 'set', 'type', `weight_${unit}`, 'reps']];
    for (const w of [...history].reverse())
      for (const ex of w.exercises)
        ex.sets.forEach((s, i) =>
          rows.push([
            new Date(w.startedAt).toISOString(),
            w.name,
            exMap.get(ex.exerciseId)?.name ?? ex.exerciseId,
            String(i + 1),
            s.type,
            s.weight == null ? '' : String(Math.round(toDisplay(s.weight, unit) * 100) / 100),
            String(s.reps ?? ''),
          ]),
        );
    downloadFile(
      `liftlog-sets-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n'),
      'text/csv',
    );
  };

  const importData = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || !Array.isArray(parsed.workouts)) throw new Error('Not a Liftlog backup');
      if (!confirm(`Replace all current data with this backup (${parsed.workouts.length} workouts)?`)) return;
      replaceAll(normalizeData(parsed));
      alert('Backup restored.');
    } catch (e) {
      alert('Could not import file: ' + (e as Error).message);
    }
  };

  const importRoutines = async (file: File) => {
    try {
      const res = importPlanCsv(await file.text(), exercises);
      if (!res.routines.length) throw new Error('No workouts found in the file.');
      const replacing = res.routines.filter((r) => data.routines.some((x) => x.name === r.name)).map((r) => r.name);
      const msg = [
        `Import ${res.routines.length} routine(s)?`,
        ...res.routines.map((r) => `• ${r.name} (${r.exercises.length} exercises)`),
        '',
        'Exercise matching:',
        ...res.matches.map((m) => `• ${m.source} → ${m.label}${m.created ? ' (new custom)' : ''}`),
        ...(replacing.length ? ['', `Existing routines with the same name will be replaced: ${replacing.join(', ')}`] : []),
      ].join('\n');
      if (!confirm(msg)) return;
      update((d) => {
        d.exercises.push(...res.newExercises);
        for (const r of res.routines) {
          const i = d.routines.findIndex((x) => x.name === r.name);
          if (i >= 0) d.routines[i] = { ...r, id: d.routines[i].id };
          else d.routines.push(r);
        }
      });
      alert(`Imported ${res.routines.length} routine(s). Find them on the Workout tab.`);
    } catch (e) {
      alert('Could not import CSV: ' + (e as Error).message);
    }
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1>Profile</h1>
        <ThemeToggle />
      </header>

      <div className="stats">
        <Stat label="Workouts" value={history.length} />
        <Stat label="Week streak" value={`${weekStreak(history)} 🔥`} />
        <Stat label="Total time" value={fmtDuration(totals.time)} />
        <Stat label={`Volume (${unit})`} value={fmtNumber(toDisplay(totals.vol, unit))} />
      </div>

      <div className="card">
        <h3>Workouts per week</h3>
        <BarChart bars={weeks} />
      </div>

      <div className="card">
        <h3>Sets per muscle · last 30 days</h3>
        {!muscles.length && <p className="muted">No workouts in the last 30 days.</p>}
        <div className="hbars">
          {muscles.map(([m, n]) => (
            <div key={m} className="hbar">
              <span>{m}</span>
              <div className="hbar-track">
                <div className="hbar-fill" style={{ width: `${(n / maxMuscle) * 100}%` }} />
              </div>
              <strong>{n}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Body weight</h3>
          {latestBw && <strong>{fmtWeight(latestBw.kg, unit)}</strong>}
        </div>
        <div className="row gap-s">
          <NumInput value={bwInput} onChange={setBwInput} placeholder={`Weight (${unit})`} className="grow" />
          <button
            className="btn primary"
            disabled={!bwInput}
            onClick={() => {
              const kg = fromDisplay(bwInput!, unit);
              update((d) => void d.bodyweight.push({ id: uid(), date: Date.now(), kg }));
              setBwInput(null);
            }}
          >
            Log
          </button>
        </div>
        {bwSorted.length > 0 && (
          <>
            <LineChart points={bwSorted.map((b) => ({ x: b.date, y: b.kg }))} format={(v) => fmtWeight(v, unit)} height={160} />
            <details>
              <summary className="muted small">All entries ({bwSorted.length})</summary>
              <ul className="bw-list">
                {[...bwSorted].reverse().map((b) => (
                  <li key={b.id}>
                    <span>{fmtShortDate(b.date)}</span>
                    <span>{fmtWeight(b.kg, unit)}</span>
                    <button
                      className="icon-btn danger"
                      aria-label="Delete entry"
                      onClick={() => update((d) => void (d.bodyweight = d.bodyweight.filter((x) => x.id !== b.id)))}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}
      </div>

      <div className="card">
        <h3>Settings</h3>
        <div className="field">
          <span>Appearance</span>
          <div className="seg">
            {(
              [
                ['system', 'System'],
                ['light', 'Light'],
                ['dark', 'Dark'],
              ] as [ThemePref, string][]
            ).map(([t, label]) => (
              <button
                key={t}
                className={data.settings.theme === t ? 'on' : ''}
                onClick={() => update((d) => void (d.settings.theme = t))}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Units</span>
          <div className="seg">
            {(['kg', 'lb'] as Unit[]).map((u) => (
              <button key={u} className={unit === u ? 'on' : ''} onClick={() => update((d) => void (d.settings.unit = u))}>
                {u}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span>Default rest timer</span>
          <select
            value={data.settings.defaultRest}
            onChange={(e) => update((d) => void (d.settings.defaultRest = Number(e.target.value)))}
          >
            {REST_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {fmtRest(r)}
              </option>
            ))}
          </select>
        </label>
        <label className="toggle-line">
          <input
            type="checkbox"
            checked={data.settings.sound}
            onChange={(e) => update((d) => void (d.settings.sound = e.target.checked))}
          />
          Sound &amp; vibration when rest ends
        </label>
      </div>

      <div className="card">
        <h3>Your data</h3>
        <p className="muted small">
          Everything is stored in this browser only. Export a backup regularly, or to move to another device.
          Routine CSVs need one row per exercise with Workout and Exercise columns (optional: Sets, Target, Rest, Notes).
        </p>
        <div className="btn-row">
          <button className="btn ghost" onClick={exportData}>
            Export backup (JSON)
          </button>
          <button className="btn ghost" onClick={exportCsv}>
            Export sets (CSV)
          </button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
          <button className="btn ghost" onClick={() => csvRef.current?.click()}>
            Import routines (CSV)
          </button>
          <button
            className="btn danger-ghost"
            onClick={() => {
              if (confirm('Delete ALL workouts, routines and settings? This cannot be undone.') && confirm('Are you really sure?'))
                replaceAll(emptyData());
            }}
          >
            Reset all data
          </button>
        </div>
        <input
          ref={csvRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importRoutines(f);
            e.target.value = '';
          }}
        />
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importData(f);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
