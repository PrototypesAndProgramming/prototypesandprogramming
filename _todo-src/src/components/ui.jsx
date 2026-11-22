import { COLORS } from '../colors.js';
import { WEEKDAYS } from '../recurrence.js';

export function Sheet({ title, onClose, children, actions }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div className="sheet-title">{title}</div>
          <button className="icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="sheet-body">{children}</div>
        {actions && <div className="sheet-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function ColorPicker({ value, onChange, allowNone }) {
  return (
    <div className="colors">
      {allowNone && (
        <button type="button" className={`swatch none ${!value ? 'on' : ''}`} onClick={() => onChange(null)} title="Same as parent">
          ∅
        </button>
      )}
      {COLORS.map((c) => (
        <button
          type="button" key={c}
          className={`swatch ${value === c ? 'on' : ''}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}

export function DayToggles({ value = [], onChange }) {
  return (
    <div className="daytoggles">
      {WEEKDAYS.map((d, i) => (
        <button
          type="button" key={d}
          className={value.includes(i) ? 'on' : ''}
          onClick={() => onChange(value.includes(i) ? value.filter((x) => x !== i) : [...value, i].sort())}
        >
          {d[0]}
        </button>
      ))}
    </div>
  );
}

export function Breadcrumb({ chain, onPick }) {
  if (chain.length < 2) return null;
  return (
    <div className="crumbs">
      {chain.slice(0, -1).map((n, i) => (
        <span key={n.id}>
          <button className="link" onClick={() => onPick(i)}>{n.title || 'Untitled'}</button>
          <span className="sep">›</span>
        </span>
      ))}
    </div>
  );
}

export function ProgressBar({ done, total, color }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="progress" title={`${done}/${total}`}>
      <div style={{ width: `${pct}%`, background: color || 'var(--navy)' }} />
    </div>
  );
}
