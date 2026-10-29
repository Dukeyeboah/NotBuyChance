/** Glossy icons in public/assets/icons. Keys match existing category and mode ids. */
export const discoveryIcons: Record<string, string> = {
  dining: "/assets/icons/dining.png",
  fashion: "/assets/icons/fashion.png",
  music: "/assets/icons/music.png",
  books: "/assets/icons/books.png",
  screen: "/assets/icons/movies-tv.png",
  tech: "/assets/icons/electronics.png",
  experiences: "/assets/icons/experiences.png",
  surprise: "/assets/icons/surprise.png",
};

export const utilityIcons = {
  food: "/assets/icons/food.png",
  cosmic: "/assets/icons/cosmic.png",
  fusion: "/assets/icons/fusion.png",
  profile: "/assets/icons/profile.png",
  favorites: "/assets/icons/favorites.png",
  taste: "/assets/icons/taste.png",
  refine: "/assets/icons/refine.png",
  gift: "/assets/icons/gift.png",
} as const;

export function iconForCategory(id: string): string {
  if (id === "dining") return utilityIcons.food;
  return discoveryIcons[id] || utilityIcons.gift;
}

export function iconForMode(mode: string): string {
  if (mode === "cosmic") return utilityIcons.cosmic;
  if (mode === "fusion") return utilityIcons.fusion;
  return utilityIcons.taste;
}
