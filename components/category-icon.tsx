import { discoveryIcons, iconForMode, utilityIcons } from "@/lib/icons";

export function CategoryIcon({
  id,
  size = 64,
  selected = false,
  motion = "none",
  className = "",
}: {
  id: string;
  size?: number;
  selected?: boolean;
  motion?: "none" | "float" | "orbit";
  className?: string;
}) {
  const src =
    discoveryIcons[id] ||
    utilityIcons[id as keyof typeof utilityIcons] ||
    (id === "taste" || id === "cosmic" || id === "fusion" ? iconForMode(id) : utilityIcons.gift);
  const motionClass = motion === "float" ? "icon-float" : motion === "orbit" ? "icon-orbit" : "";
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`object-contain transition-transform duration-200 ${selected ? "scale-105" : ""} ${motionClass} ${className}`}
    />
  );
}
