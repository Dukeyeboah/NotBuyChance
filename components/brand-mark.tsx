export function BrandMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt=""
      className={`object-contain ${className}`}
    />
  );
}
