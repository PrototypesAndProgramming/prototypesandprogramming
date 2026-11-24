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

/**
 * 24-hour time picker (phones show native time inputs in 12-hour format, so this
 * uses two selects instead). value "HH:MM" or '' when allowEmpty.
 */
export function TimeInput({ value, onChange, allowEmpty }) {
  const [h, m] = value ? value.split(':') : ['', ''];
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const mins = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  if (m && !mins.includes(m)) mins.push(m), mins.sort();
  return (
    <div className="timeinput">
      <select
        value={h}
        onChange={(e) => {
          const nh = e.target.value;
          onChange(nh === '' ? '' : `${nh}:${m || '00'}`);
        }}
      >
        {allowEmpty && <option value="">--</option>}
        {hours.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <span>:</span>
      <select value={m} disabled={!h} onChange={(e) => onChange(`${h || '00'}:${e.target.value}`)}>
        {(allowEmpty && !h) && <option value="">--</option>}
        {mins.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    </div>
  );
}

/**
 * Shows the date as YYYY-MM-DD. An invisible native date input sits on top,
 * so tapping still opens the phone/computer's calendar picker.
 */
export function DateInput({ value, onChange, allowEmpty, placeholder = 'YYYY-MM-DD' }) {
  return (
    <div className="dateinput">
      <div className={`dateinput-face ${value ? '' : 'empty'}`}>{value || placeholder}</div>
      <input
        type="date"
        value={value || ''}
        onChange={(e) => (e.target.value || allowEmpty) && onChange(e.target.value)}
        aria-label="Date"
        onClick={(e) => {
          try {
            e.currentTarget.showPicker();
          } catch {
            /* older browsers open it on tap anyway */
          }
        }}
      />
      {allowEmpty && value && (
        <button type="button" className="dateinput-clear" onClick={() => onChange('')} aria-label="Clear date">
          ✕
        </button>
      )}
    </div>
  );
}
