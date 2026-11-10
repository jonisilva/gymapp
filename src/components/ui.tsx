import { ReactNode, useEffect, useState } from 'react';
import { fmtClock, parseTime } from '../utils';

export function useRoute() {
  const get = () => window.location.hash.slice(1) || '/';
  const [route, setRoute] = useState(get);
  useEffect(() => {
    const h = () => {
      setRoute(get());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  return route;
}

export const nav = (path: string) => {
  window.location.hash = path;
};

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function NumInput({
  value,
  onChange,
  placeholder,
  decimal = true,
  className,
  ariaLabel,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  decimal?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(value == null ? '' : String(value));

  useEffect(() => {
    const parsed = text.trim() === '' ? null : Number(text.replace(',', '.'));
    const same = parsed === value || (parsed != null && value != null && Math.abs(parsed - value) < 1e-6);
    if (!same) setText(value == null ? '' : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      className={className}
      aria-label={ariaLabel}
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={text}
      placeholder={placeholder}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const t = e.target.value;
        if (!(decimal ? /^\d*([.,]\d*)?$/ : /^\d*$/).test(t)) return;
        setText(t);
        const n = t === '' || t === '.' || t === ',' ? null : Number(t.replace(',', '.'));
        onChange(n == null || isNaN(n) ? null : n);
      }}
    />
  );
}

/** Time input in seconds; accepts "45", "0:45", "7:00". */
export function TimeInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(value == null ? '' : fmtClock(value));
  useEffect(() => {
    if (parseTime(text) !== value) setText(value == null ? '' : fmtClock(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      aria-label={ariaLabel}
      inputMode="numeric"
      value={text}
      placeholder={placeholder}
      onFocus={(e) => e.target.select()}
      onBlur={() => value != null && setText(fmtClock(value))}
      onChange={(e) => {
        const t = e.target.value;
        if (!/^[\d:]*$/.test(t)) return;
        setText(t);
        onChange(parseTime(t));
      }}
    />
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', k);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Menu({ items }: { items: { label: string; onClick: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const t = setTimeout(() => window.addEventListener('click', close), 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener('click', close);
    };
  }, [open]);
  return (
    <div className="menu-wrap">
      <button className="icon-btn" aria-label="More options" onClick={() => setOpen((o) => !o)}>
        ⋯
      </button>
      {open && (
        <div className="menu">
          {items.map((it) => (
            <button key={it.label} className={it.danger ? 'danger' : ''} onClick={it.onClick}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
