import type { DiscoveryDraft, ImagePreference, VisualAppearance } from "@/types/discovery";

/** Heritage the user states. This is not a taste signal and not an appearance guess. */
export const ETHNICITY_OPTIONS = [
  ["black_african", "Black / African descent"],
  ["african_american", "African American"],
  ["afro_caribbean", "Afro-Caribbean"],
  ["hispanic_latino", "Hispanic / Latino"],
  ["east_asian", "East Asian"],
  ["south_asian", "South Asian"],
  ["southeast_asian", "Southeast Asian"],
  ["mena", "Middle Eastern / North African"],
  ["white_european", "White / European descent"],
  ["indigenous", "Indigenous"],
  ["mixed", "Mixed or multiple heritages"],
  ["self_describe", "Other / Self-describe"],
  ["prefer_not", "Prefer not to say"],
] as const;

const ETHNICITY_IDS = new Set<string>(ETHNICITY_OPTIONS.map(([id]) => id));

export function allowedEthnicity(ids: string[]): string[] {
  const next: string[] = [];
  for (const id of ids) {
    if (!ETHNICITY_IDS.has(id) || next.includes(id)) continue;
    next.push(id);
  }
  return next.slice(0, 12);
}

export function appearanceText(appearance: VisualAppearance | undefined): string {
  if (!appearance) return "";
  return [appearance.skinTone, appearance.hair, appearance.style, appearance.additionalDetails]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(". ");
}

export function depictsRecipient(draft: Pick<DiscoveryDraft, "imagePreference" | "visualAppearance">): boolean {
  return draft.imagePreference === "describe-appearance" && appearanceText(draft.visualAppearance).length > 0;
}

const SCENE_STYLE: Record<string, string> = {
  dining: "Show the meal and the room in a warm editorial illustration.",
  fashion: "Focus on the clothing or accessories, like a fashion still life.",
  music: "Show instruments, a small stage, or a listening room.",
  books: "A quiet book still life. Do not invent a cover with readable title text.",
  screen: "A cinematic mood of a story or screening, without copying a real poster.",
  tech: "A clean, modern product image of the object.",
  experiences: "A warm illustration of the setting.",
  surprise: "A warm illustration of the discovery itself.",
};

export function illustrationPrompt(options: {
  title: string;
  description?: string;
  category?: string;
  mode?: string;
  city?: string;
  age?: string;
  imagePreference?: ImagePreference | string;
  appearance?: Partial<VisualAppearance>;
  ethnicityLabels?: string[];
}): string {
  const title = options.title.trim();
  const preference = options.imagePreference || "subject-only";
  const appearance = appearanceText({
    skinTone: options.appearance?.skinTone ?? "",
    hair: options.appearance?.hair ?? "",
    style: options.appearance?.style ?? "",
    additionalDetails: options.appearance?.additionalDetails ?? "",
  });
  const showPerson = preference === "describe-appearance" && appearance.length > 0;
  const lines = [
    "Editorial illustration in a coral, violet, and cream palette. Rounded forms, soft light, consistent with a calm gift-discovery app.",
    SCENE_STYLE[options.category || ""] || "Focus on the recommended gift, place, or experience.",
    `Subject: ${title}.`,
    options.description ? `Moment: ${options.description}` : "",
    options.city ? `The setting may suggest ${options.city}.` : "",
  ];
  if (showPerson) {
    const heritage = (options.ethnicityLabels ?? []).map((label) => label.trim()).filter(Boolean);
    lines.push(
      `Include one person using only these stated appearance details: ${appearance}.`,
      options.age ? `Approximate age: ${options.age}.` : "",
      heritage.length
        ? `The person is described as ${heritage.join(", ")}. Use that only together with the appearance details, and do not invent extra features.`
        : "",
      "Do not replace the stated skin tone, hair, or style with a light-skinned or White default.",
      "Do not add traditional clothing or cultural costume that was not described.",
      "Do not infer extra physical traits from a name, birth date, or sun sign.",
    );
  } else {
    lines.push(
      "Do not depict an identifiable recipient.",
      "Keep the image on the gift, place, food, object, or experience.",
      "Do not invent a person's ethnicity, skin tone, or hairstyle.",
    );
  }
  if (options.mode === "cosmic" || options.mode === "fusion") {
    lines.push("A subtle celestial atmosphere is welcome. Do not invent physical characteristics from astrology or numerology.");
  }
  lines.push(
    "No text, no letters, no logos, and no watermark.",
    "This is an illustration, not a photograph of a real person, event, venue, or product.",
  );
  return lines.filter(Boolean).join(" ");
}
