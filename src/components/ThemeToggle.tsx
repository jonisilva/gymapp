import { effectiveTheme, useStore } from '../store';

const SUN = 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z';
const MOON = 'M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z';

/** Quick light/dark switch. Picks the opposite of what's currently showing. */
export function ThemeToggle() {
  const { data, update } = useStore();
  const current = effectiveTheme(data.settings.theme);
  const next = current === 'dark' ? 'light' : 'dark';
  return (
    <button
      className="icon-btn theme-btn"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={() => update((d) => void (d.settings.theme = next))}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={current === 'dark' ? SUN : MOON} />
      </svg>
    </button>
  );
}
