import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const styles = {
    primary: "btn-primary",
    secondary: "border border-line bg-card text-ink hover:bg-accent-soft",
    ghost: "text-ink hover:bg-accent-soft",
  }[variant];
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center rounded-full px-5 text-[15px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
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
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {hint ? <span className="mt-1 block text-sm text-muted">{hint}</span> : null}
      <div className="mt-2">{children}</div>
    </label>
  );
}

const control =
  "w-full rounded-2xl border border-line bg-card px-4 py-3 text-base outline-none transition placeholder:text-muted/80 focus:border-accent";

export function TextInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${control} ${className}`} {...props} />;
}

export function TextArea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${control} min-h-28 resize-y ${className}`} {...props} />;
}

export function Choice({
  selected,
  title,
  detail,
  mark,
  tone,
  showCheck = false,
  onClick,
}: {
  selected: boolean;
  title: string;
  detail?: string;
  mark?: ReactNode;
  tone?: string;
  showCheck?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`relative min-h-12 rounded-2xl border px-4 py-3 text-left transition duration-200 hover:-translate-y-0.5 ${showCheck ? "pr-8" : ""} ${tone || "bg-card"} ${
        selected ? "choice-selected border-accent shadow-[0_0_0_2px_var(--accent)]" : "border-line hover:border-accent/40"
      }`}
    >
      {showCheck && selected ? (
        <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] text-white" aria-hidden>
          ✓
        </span>
      ) : null}
      <span className="flex items-center gap-3">
        {mark ? <span className="shrink-0">{mark}</span> : null}
        <span className="min-w-0">
          <span className="block font-medium">{title}</span>
          {detail ? <span className="mt-1 block text-sm text-muted">{detail}</span> : null}
        </span>
      </span>
    </button>
  );
}
