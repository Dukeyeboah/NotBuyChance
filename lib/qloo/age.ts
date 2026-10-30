import { ageFromIso } from "@/lib/cosmic/calculate";

export type QlooAgeBand = "35_and_younger" | "36_to_55" | "55_and_older";

function bandForAge(age: number): QlooAgeBand | undefined {
  if (!Number.isFinite(age) || age < 0 || age > 120) return undefined;
  if (age <= 35) return "35_and_younger";
  if (age <= 55) return "36_to_55";
  return "55_and_older";
}

export function qlooAgeSignal(input: {
  age?: number;
  birthDate?: string;
  ageRange?: string;
}): QlooAgeBand | undefined {
  if (typeof input.age === "number") {
    const fromAge = bandForAge(input.age);
    if (fromAge) return fromAge;
  }
  if (input.birthDate) {
    const fromDate = ageFromIso(input.birthDate);
    if (fromDate != null) return bandForAge(fromDate);
  }
  switch (input.ageRange) {
    case "Under 18":
    case "18–24":
    case "25–34":
      return "35_and_younger";
    case "35–44":
    case "45–54":
      return "36_to_55";
    case "55–64":
    case "65+":
      return "55_and_older";
    default:
      return undefined;
  }
}
