import type { DiscoveryDraft } from "@/types/discovery";
import type { StoredPerson } from "@/lib/storage";
import { discoveryIcons, utilityIcons } from "@/lib/icons";
import { firstName } from "@/lib/text";

export interface PreviewItem {
  label: string;
  icon: string;
  tone?: string;
}

export interface DiscoveryPreviewModel {
  name: string;
  interests: PreviewItem[];
  discoveries: PreviewItem[];
  caption: string;
}

const TONES: Record<string, string> = {
  dining: "tone-dining",
  fashion: "tone-fashion",
  music: "tone-music",
  books: "tone-books",
  screen: "tone-screen",
  tech: "tone-tech",
  experiences: "tone-experiences",
  surprise: "tone-surprise",
};

/** The icon sheet has no palette. Art and other creative interests use the taste sparkle. Travel uses the map. */
export function iconForInterest(label: string): string {
  const text = label.toLowerCase();
  if (/jazz|music|concert|song|soul|album|microphone/.test(text)) return discoveryIcons.music;
  if (/book|read|novel/.test(text)) return discoveryIcons.books;
  if (/travel|trip|getaway|weekend|map|destination|suitcase/.test(text)) return discoveryIcons.experiences;
  if (/food|dining|restaurant|chef|cook/.test(text)) return discoveryIcons.dining;
  if (/movie|film|\btv\b|screen|show/.test(text)) return discoveryIcons.screen;
  if (/fashion|cloth|style|wear/.test(text)) return discoveryIcons.fashion;
  if (/tech|gadget|electronic|phone/.test(text)) return discoveryIcons.tech;
  if (/surprise|gift/.test(text)) return discoveryIcons.surprise;
  if (/art|paint|gallery|exhibit|design|photo|palette/.test(text)) return utilityIcons.taste;
  return utilityIcons.taste;
}

export function iconForDiscovery(category: string, title: string): string {
  return discoveryIcons[category] || iconForInterest(title);
}

export const demoPreview: DiscoveryPreviewModel = {
  name: "Maya",
  interests: [
    { label: "Jazz", icon: discoveryIcons.music },
    { label: "Art", icon: utilityIcons.taste },
    { label: "Travel", icon: discoveryIcons.experiences },
  ],
  discoveries: [
    { label: "Intimate jazz concert", icon: discoveryIcons.music, tone: "tone-music" },
    { label: "Contemporary art exhibition", icon: utilityIcons.taste, tone: "tone-experiences" },
    { label: "Design-inspired coffee-table book", icon: discoveryIcons.books, tone: "tone-books" },
    { label: "Weekend cultural getaway", icon: discoveryIcons.experiences, tone: "tone-dining" },
  ],
  caption: "A preview of the feeling. Not a live recommendation.",
};

function interestLabels(draft: DiscoveryDraft): string[] {
  const chips = draft.interestChips.map((chip) => chip.trim()).filter(Boolean);
  if (chips.length) return chips.slice(0, 4);
  return draft.interestsText
    .split(/[,·•]|\band\b|\./i)
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && part.length < 40)
    .slice(0, 4);
}

export function previewFromPerson(person: StoredPerson): DiscoveryPreviewModel | null {
  const discoveries = (person.sessions[0]?.recommendations ?? []).slice(0, 4).map((item) => ({
    label: item.title,
    icon: iconForDiscovery(item.category, item.title),
    tone: TONES[item.category] || "tone-music",
  }));
  if (!discoveries.length) return null;
  const interests = interestLabels(person.draft).map((label) => ({
    label,
    icon: iconForInterest(label),
  }));
  const name = firstName(person.draft.name);
  return {
    name: name === "them" ? person.draft.name.trim() || "Someone" : name,
    interests,
    discoveries,
    caption: "From a saved discovery on this device.",
  };
}

export function featuredPreview(people: StoredPerson[]): DiscoveryPreviewModel {
  const featured = people.find((person) => person.featuredHomepagePreview);
  return (featured && previewFromPerson(featured)) || demoPreview;
}
