import type { ReactNode } from 'react';
import { Save } from 'lucide-react';

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="panel-card">
      <div className="panel-card__header">
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      <div className="panel-card__body">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {hint ? <small>{hint}</small> : null}
      </span>
      {children}
    </label>
  );
}

export function OutputPathRow({
  value,
  placeholder,
  onChange,
  onPick,
  saveLabel = 'Choose output',
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onPick: () => void;
  saveLabel?: string;
}) {
  return (
    <div className="output-row">
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      <button type="button" className="button button--secondary" onClick={onPick}>
        <Save size={16} />
        {saveLabel}
      </button>
    </div>
  );
}
