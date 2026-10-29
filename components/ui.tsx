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
  onClick,
}: {
  selected: boolean;
  title: string;
  detail?: string;
  mark?: ReactNode;
  tone?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-12 rounded-2xl border px-4 py-3 text-left transition ${tone || "bg-card"} ${
        selected ? "border-accent shadow-[0_0_0_2px_var(--accent)]" : "border-line hover:border-accent/50"
      }`}
    >
      <span className="flex items-start gap-3">
        {mark ? <span className="mt-0.5 text-accent">{mark}</span> : null}
        <span className="min-w-0">
      <span className="block font-medium">{title}</span>
      {detail ? <span className="mt-1 block text-sm text-muted">{detail}</span> : null}
        </span>
      </span>
    </button>
  );
}
