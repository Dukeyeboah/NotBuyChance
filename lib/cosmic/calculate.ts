/**
 * Symbolic calculations for Cosmic and Fusion modes.
 *
 * Sun sign: Western tropical zodiac from month and day only.
 * A full natal chart is not possible from a birth date, so ascendant,
 * houses, and moon sign are never produced.
 *
 * Life path: add every digit of YYYYMMDD, then reduce. 11, 22, and 33
 * are kept. Example: 2000-01-08 → 2+0+0+0+0+1+0+8 = 11.
 *
 * Expression number: Pythagorean map on the letters of the name provided
 * (A=1 … I=9, J=1 … R=9, S=1 … Z=8). Spaces and punctuation are ignored.
 * The same reduction rules apply. A single name is noted as a partial name.
 *
 * Birthday number: the calendar day, reduced with the same rules. 11 and 22 stay.
 * Example: the 29th is 2+9 = 11.
 *
 * Birth time and birthplace can be stored. They are not used to invent a
 * rising sign, moon sign, or houses.
 */

import type { CosmicProfile } from "@/types/discovery";

const SIGN_COLOR: Record<string, string> = {
  Aries: "An Aries sun likes a spark. Firsts, a little daring, and something they can start themselves.",
  Taurus: "A Taurus sun loves the senses. Good food, texture, craft, and comfort they can actually feel.",
  Gemini: "A Gemini sun is curious and chatty. Variety, a clever detour, and something worth talking about.",
  Cancer: "A Cancer sun leans toward care and home. Nostalgia, a cozy table, and gifts that feel looked-after.",
  Leo: "A Leo sun enjoys warmth and a little spotlight. Celebration, color, and a reason to dress the moment up.",
  Virgo: "A Virgo sun notices the useful detail. Skill, thoughtfulness, and something beautifully well made.",
  Libra: "A Libra sun loves harmony and beauty. A shared plan, a pretty setting, and company they enjoy.",
  Scorpio: "A Scorpio sun wants depth. Intimacy, meaning, and an experience with a little mystery.",
  Sagittarius: "A Sagittarius sun wants the horizon. Ideas, adventure, and a story they can tell afterward.",
  Capricorn: "A Capricorn sun respects craft and things that last. Quality, ambition, and a plan that holds up.",
  Aquarius: "An Aquarius sun likes the original angle. Community, ideas, and something a bit unexpected.",
  Pisces: "A Pisces sun lives in imagination. Music, empathy, and a mood they can sink into.",
};

const NUMBER_COLOR: Record<number, string> = {
  1: "A 1 likes to lead. Independence, a first, and something they can put their own stamp on.",
  2: "A 2 is the partnership number. Shared tables, duets, and gifts that say we tend to land well.",
  3: "A 3 is the creative one. Expression, color, conversation, humor, and making something people can feel. Threes light up around play.",
  4: "A 4 loves craft and things that last. A well-made object, a skill, or a plan they can trust.",
  5: "A 5 wants freedom and variety. A change of scene, a new flavor, a ticket somewhere they have not been.",
  6: "A 6 leans into care and beauty. Home, warmth, and something lovely to gather people around.",
  7: "A 7 likes depth and quiet curiosity. A story with a secret, a place worth looking at twice.",
  8: "An 8 notices quality and ambition. Lasting materials, a polished night, something that feels earned.",
  9: "A 9 is the wide-heart number. Compassion, perspective, and experiences that connect to a bigger story.",
  11: "An 11 is the insight number. Inspiration, a spark, and something that feels a little fated in a playful way.",
  22: "A 22 likes building. A big idea they can touch, a workshop, a trip with a purpose.",
  33: "A 33 mixes care and creativity. Hosting, teaching, and making something generous for other people.",
};

const SUN_THEMES: Record<string, string[]> = {
  Aries: ["initiative", "bold experiences", "new beginnings"],
  Taurus: ["comfort", "the senses", "craft"],
  Gemini: ["curiosity", "conversation", "variety"],
  Cancer: ["care", "home", "nostalgia"],
  Leo: ["expression", "celebration", "creativity"],
  Virgo: ["thoughtfulness", "skill", "useful details"],
  Libra: ["harmony", "beauty", "shared experiences"],
  Scorpio: ["depth", "intimacy", "meaning"],
  Sagittarius: ["exploration", "ideas", "adventure"],
  Capricorn: ["craft", "lasting quality", "ambition"],
  Aquarius: ["originality", "community", "ideas"],
  Pisces: ["imagination", "music", "empathy"],
};

const LIFE_PATH_THEMES: Record<number, string[]> = {
  1: ["initiative", "independence"],
  2: ["partnership", "harmony"],
  3: ["expression", "creativity"],
  4: ["craft", "reliability"],
  5: ["freedom", "variety"],
  6: ["care", "beauty"],
  7: ["curiosity", "depth"],
  8: ["ambition", "quality"],
  9: ["compassion", "perspective"],
  11: ["insight", "inspiration"],
  22: ["building", "vision"],
  33: ["care", "creativity"],
};

const SIGN_STARTS: { sign: string; month: number; day: number }[] = [
  { sign: "Capricorn", month: 1, day: 1 },
  { sign: "Aquarius", month: 1, day: 20 },
  { sign: "Pisces", month: 2, day: 19 },
  { sign: "Aries", month: 3, day: 21 },
  { sign: "Taurus", month: 4, day: 20 },
  { sign: "Gemini", month: 5, day: 21 },
  { sign: "Cancer", month: 6, day: 21 },
  { sign: "Leo", month: 7, day: 23 },
  { sign: "Virgo", month: 8, day: 23 },
  { sign: "Libra", month: 9, day: 23 },
  { sign: "Scorpio", month: 10, day: 23 },
  { sign: "Sagittarius", month: 11, day: 22 },
  { sign: "Capricorn", month: 12, day: 22 },
];

const LETTER_VALUE: Record<string, number> = {};
"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((letter, index) => {
  LETTER_VALUE[letter] = (index % 9) + 1;
});

export const COSMIC_METHOD =
  "Western tropical sun sign from the month and day. Life path is the digit sum of YYYYMMDD, reduced while keeping 11, 22, and 33. Birthday number is the calendar day, reduced the same way. The expression number uses the Pythagorean letter map on the name provided. Birth time and birthplace are saved when given, and are not used to calculate a rising sign or houses.";

export function reduceNumber(value: number): number {
  let current = Math.abs(Math.trunc(value));
  while (current > 9 && current !== 11 && current !== 22 && current !== 33) {
    current = String(current)
      .split("")
      .reduce((sum, digit) => sum + Number(digit), 0);
  }
  return current;
}

export function sunSign(month: number, day: number): string {
  let current = "Capricorn";
  for (const sign of SIGN_STARTS) {
    if (month > sign.month || (month === sign.month && day >= sign.day)) {
      current = sign.sign;
    }
  }
  return current;
}

export function parseIsoDate(
  iso: string,
): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() + 1 !== month ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function lifePathFromIso(iso: string): number | null {
  const parsed = parseIsoDate(iso);
  if (!parsed) return null;
  const digits = iso.replaceAll("-", "").split("").map(Number);
  return reduceNumber(digits.reduce((sum, digit) => sum + digit, 0));
}

export function expressionNumber(name: string): number | null {
  const letters = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  if (!letters) return null;
  const sum = [...letters].reduce(
    (total, letter) => total + (LETTER_VALUE[letter] ?? 0),
    0,
  );
  return reduceNumber(sum);
}

export function ageFromIso(iso: string, today = new Date()): number | null {
  const parsed = parseIsoDate(iso);
  if (!parsed) return null;
  let age = today.getFullYear() - parsed.year;
  const month = today.getMonth() + 1;
  const day = today.getDate();
  if (month < parsed.month || (month === parsed.month && day < parsed.day)) {
    age -= 1;
  }
  if (age < 0 || age > 120) return null;
  return age;
}

export function birthdayNumber(iso: string): number | null {
  const parsed = parseIsoDate(iso);
  if (!parsed) return null;
  return reduceNumber(parsed.day);
}

export function buildCosmicProfile(
  name: string,
  birthDate?: string,
  notes?: { birthTime?: string; birthPlace?: string },
): CosmicProfile | null {
  const safeName = name.trim() || "They";
  const expression = expressionNumber(safeName);
  const parsed = birthDate ? parseIsoDate(birthDate) : null;
  const sign = parsed ? sunSign(parsed.month, parsed.day) : undefined;
  const lifePath = birthDate ? lifePathFromIso(birthDate) ?? undefined : undefined;
  const birthday = birthDate ? birthdayNumber(birthDate) ?? undefined : undefined;
  if (!expression && !sign && !lifePath) return null;

  const themes = [
    ...(sign ? SUN_THEMES[sign] ?? [] : []),
    ...(lifePath ? LIFE_PATH_THEMES[lifePath] ?? [] : []),
    ...(birthday ? LIFE_PATH_THEMES[birthday] ?? [] : []),
  ].filter((theme, index, all) => all.indexOf(theme) === index);

  const first = safeName.split(/\s+/)[0] || "They";
  const themePhrase = themes.slice(0, 3).join(", ");
  const opening = themePhrase
    ? `Based on ${first}'s astrological and numerological profile, themes of ${themePhrase} come through. These interpretations suggest directions we could explore when choosing something special.`
    : `${first}'s profile can grow from here. A birth date adds a sun sign, a life path, and a birthday number.`;
  const color = [
    sign ? SIGN_COLOR[sign] : "",
    lifePath ? `Life path ${lifePath}. ${NUMBER_COLOR[lifePath] ?? ""}` : "",
    birthday ? `Birthday number ${birthday}. ${NUMBER_COLOR[birthday] ?? ""}` : "",
    expression && expression !== lifePath && expression !== birthday
      ? `Expression number ${expression}. ${NUMBER_COLOR[expression] ?? ""}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  const savedPlace = [notes?.birthTime?.trim(), notes?.birthPlace?.trim()].filter(Boolean);
  const scope = !parsed
    ? " Add a birth date for the sun sign, life path, and birthday number."
    : savedPlace.length
      ? " Birth time and place are saved with this profile. This reading uses the sun sign and the numbers from the date and name. Rising sign and houses are not calculated."
      : "";
  const nameNote =
    safeName.split(/\s+/).length < 2 ? " The expression number uses the name that was entered." : "";
  const limited = !parsed;
  const reading = `${opening} ${color}${scope}${nameNote}`.replace(/\s+/g, " ").trim();

  return {
    sunSign: sign,
    lifePath,
    birthdayNumber: birthday,
    expression: expression ?? undefined,
    themes: themes.slice(0, 6),
    reading,
    limited,
    method: COSMIC_METHOD,
  };
}
