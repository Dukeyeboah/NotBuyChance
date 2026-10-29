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
 * The same reduction rules apply. A first name alone is labeled as limited.
 */

import type { CosmicProfile } from "@/types/discovery";

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
  "Western tropical sun sign from the birth date only. Life path is the digit sum of YYYYMMDD, reduced while keeping 11, 22, and 33. The expression number uses the Pythagorean letter map on the name provided. Birth time and birthplace are not used, so this is not a natal chart.";

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

export function buildCosmicProfile(
  name: string,
  birthDate?: string,
): CosmicProfile | null {
  const safeName = name.trim() || "They";
  const expression = expressionNumber(safeName);
  const parsed = birthDate ? parseIsoDate(birthDate) : null;
  const sign = parsed ? sunSign(parsed.month, parsed.day) : undefined;
  const lifePath = birthDate ? lifePathFromIso(birthDate) ?? undefined : undefined;
  if (!expression && !sign && !lifePath) return null;

  const themes = [
    ...(sign ? SUN_THEMES[sign] ?? [] : []),
    ...(lifePath ? LIFE_PATH_THEMES[lifePath] ?? [] : []),
  ].filter((theme, index, all) => all.indexOf(theme) === index);

  const pieces: string[] = [];
  if (sign) pieces.push(`a ${sign} sun`);
  if (lifePath) pieces.push(`life path ${lifePath}`);
  if (expression) pieces.push(`a name number of ${expression}`);
  const themeText = themes.slice(0, 3).join(", ");
  const limited = !parsed;
  const reading = `This is a symbolic reading for entertainment, not a personality assessment. From ${pieces.join(", ")}, the themes we can play with are ${themeText || "curiosity and care"}. They are creative prompts for gifts and experiences, not facts about ${safeName}.${limited ? " Without a birth date, this uses only the name that was shared." : " It is a sun-sign and life-path sketch, not a full birth chart."}`;

  return {
    sunSign: sign,
    lifePath,
    expression: expression ?? undefined,
    themes: themes.slice(0, 6),
    reading,
    limited,
    method: COSMIC_METHOD,
  };
}
