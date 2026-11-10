import { useStore } from './store';
import { fmtClock } from './utils';
import { nav, useNow, useRoute } from './components/ui';
import { RestTimer } from './components/RestTimer';
import Home from './pages/Home';
import ActiveWorkout from './pages/ActiveWorkout';
import History from './pages/History';
import WorkoutDetail from './pages/WorkoutDetail';
import Exercises from './pages/Exercises';
import ExerciseDetail from './pages/ExerciseDetail';
import RoutineEditor from './pages/RoutineEditor';
import Profile from './pages/Profile';

const ICONS: Record<string, string> = {
  workout: 'M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11',
  history: 'M12 7v5l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z',
  exercises: 'M3 3v18h18M7 15l4-4 3 3 6-6',
  profile: 'M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zM4 21a8 8 0 0 1 16 0',
};

const Icon = ({ name }: { name: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={ICONS[name]} />
  </svg>
);

const TABS = [
  { path: '/', label: 'Workout', icon: 'workout', match: (r: string) => r === '/' || r.startsWith('/workout') || r.startsWith('/routine') },
  { path: '/history', label: 'History', icon: 'history', match: (r: string) => r.startsWith('/history') },
  { path: '/exercises', label: 'Exercises', icon: 'exercises', match: (r: string) => r.startsWith('/exercises') },
  { path: '/profile', label: 'Profile', icon: 'profile', match: (r: string) => r.startsWith('/profile') },
];

function Page({ route }: { route: string }) {
  const [path, query = ''] = route.split('?');
  const parts = path.split('/').filter(Boolean);
  switch (parts[0]) {
    case undefined:
      return <Home />;
    case 'workout':
      return <ActiveWorkout />;
    case 'history':
      return parts[1] ? (
        <WorkoutDetail key={parts[1]} id={parts[1]} justFinished={query.includes('done=1')} />
      ) : (
        <History />
      );
    case 'exercises':
      return parts[1] ? <ExerciseDetail key={parts[1]} id={decodeURIComponent(parts[1])} /> : <Exercises />;
    case 'routine':
      return <RoutineEditor key={parts[1]} id={parts[1] ?? 'new'} />;
    case 'profile':
      return <Profile />;
    default:
      return <Home />;
  }
}

function ActiveBanner() {
  const { data } = useStore();
  const now = useNow(1000);
  if (!data.active) return null;
  return (
    <button className="active-banner" onClick={() => nav('/workout')}>
      <span className="pulse" /> {data.active.name}
      <strong>{data.active.editingId ? 'Editing' : fmtClock((now - data.active.startedAt) / 1000)}</strong>
    </button>
  );
}

export default function App() {
  const route = useRoute();
  const onWorkout = route.startsWith('/workout');
  return (
    <div className="app">
      <main>
        <Page route={route} />
      </main>
      <div className="bottom-dock">
        <RestTimer />
        {!onWorkout && <ActiveBanner />}
        <nav className="tabbar">
          {TABS.map((t) => (
            <button key={t.path} className={t.match(route) ? 'tab on' : 'tab'} onClick={() => nav(t.path)}>
              <Icon name={t.icon} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
