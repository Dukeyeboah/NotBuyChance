"use client";

import { jsPDF } from "jspdf";
import type { DiscoveryDraft, DiscoveryResult, Recommendation } from "@/types/discovery";
import { buildCosmicProfile } from "@/lib/cosmic/calculate";
import { budgetLabel, formatDay, formatMoney } from "@/lib/format";
import { lookupLinks } from "@/lib/links";
import {
  AVAILABILITY_LABELS,
  MODE_LABELS,
  OCCASION_LABELS,
  RELATIONSHIP_LABELS,
  SUITABILITY_LABELS,
  categoryLabel,
} from "@/lib/qloo/categories";
import { firstName } from "@/lib/text";
import { illustrationFor } from "@/components/illustrations";

const INK: [number, number, number] = [31, 41, 55];
const MUTED: [number, number, number] = [107, 114, 128];
const ACCENT: [number, number, number] = [79, 70, 229];

export function pdfFilename(name: string): string {
  const raw = firstName(name);
  const safe = raw === "them" ? "Discovery" : raw.replace(/[^\p{L}\p{N}]+/gu, "");
  return `NotBuyChance_${safe || "Discovery"}_Discovery.pdf`;
}

function imageUrls(item: Recommendation): string[] {
  const drawn = illustrationFor(item.id);
  const evidence = item.qlooEvidence.map((entry) => entry.imageUrl).filter((url): url is string => Boolean(url));
  return [drawn, ...evidence].filter((url): url is string => Boolean(url));
}

async function loadJpeg(urls: string[]): Promise<{ data: string; width: number; height: number } | null> {
  if (typeof document === "undefined") return null;
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const bitmap = await createImageBitmap(await response.blob());
      const scale = Math.min(1, 720 / Math.max(bitmap.width, 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) continue;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      return { data: canvas.toDataURL("image/jpeg", 0.82), width: canvas.width, height: canvas.height };
    } catch {
      continue;
    }
  }
  return null;
}

function profileLines(draft: DiscoveryDraft): string[] {
  const lines: string[] = [];
  const add = (label: string, value: string) => {
    const text = value.trim();
    if (text) lines.push(`${label}: ${text}`);
  };
  add("Name", draft.name);
  if (draft.birthDate) add("Birth date", formatDay(draft.birthDate));
  else add("Age", draft.age || draft.ageRange);
  add("Place", [draft.city, draft.country].filter(Boolean).join(", "));
  add(
    "Cultural background",
    [draft.culturalLabels.filter(Boolean).join(", "), draft.culturalNotes].filter(Boolean).join(" — "),
  );
  add(
    "Heritage",
    [
      ...draft.ethnicity.filter((id) => id !== "prefer_not" && id !== "self_describe"),
      draft.ethnicity.includes("self_describe") ? draft.ethnicityOther : "",
    ]
      .filter(Boolean)
      .join(", "),
  );
  add("Interests", [...draft.interestChips, draft.interestsText].filter(Boolean).join(" · "));
  add(
    "Occasion",
    [...draft.occasions.map((id) => OCCASION_LABELS[id] || id), draft.occasionOther].filter(Boolean).join(", "),
  );
  add(
    "Budget",
    budgetLabel({
      tier: draft.budgetTier,
      currency: draft.currency,
      min: draft.budgetMin,
      max: draft.budgetMax,
    }),
  );
  add("Categories", draft.categories.map((id) => categoryLabel(id)).join(", "));
  add(
    "Relationship",
    RELATIONSHIP_LABELS[draft.forSelf ? "myself" : draft.relationship] || "",
  );
  return lines;
}

export async function buildFindingsPdf(draft: DiscoveryDraft, result: DiscoveryResult): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 54;
  const width = pageWidth - margin * 2;
  let y = margin;

  const room = () => pageHeight - margin - 40 - y;
  const newPage = () => {
    doc.addPage();
    y = margin;
  };

  function text(
    value: string,
    size: number,
    color: [number, number, number],
    style: "normal" | "bold" = "normal",
    extraGap = 6,
  ) {
    const content = value.trim();
    if (!content) return;
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(content, width) as string[];
    const lineHeight = size * 1.45;
    for (const line of lines) {
      if (room() < lineHeight) newPage();
      doc.text(line, margin, y + size);
      y += lineHeight;
    }
    y += extraGap;
  }

  function heading(value: string) {
    if (room() < 78) newPage();
    text(value, 16, INK, "bold", 8);
  }

  const name = firstName(draft.name);
  const display = name === "them" ? "A discovery" : name;
  text("NotBuyChance", 12, ACCENT, "bold", 12);
  text(display, 32, INK, "bold", 4);
  text(`Generated ${formatDay(new Date().toISOString())}`, 11, MUTED, "normal", 2);
  text(`Mode: ${MODE_LABELS[draft.mode] || draft.mode}`, 11, MUTED, "normal", 14);
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(1);
  if (room() < 12) newPage();
  doc.line(margin, y, margin + width, y);
  y += 16;

  heading("Profile");
  for (const line of profileLines(draft)) text(line, 11, INK, "normal", 3);
  y += 8;

  heading("Discovery summary");
  text(
    result.summary?.trim() ||
      `These ideas follow what you shared about ${display}. Each one stays tied to that picture.`,
    11,
    INK,
    "normal",
    8,
  );
  const told = [
    ...new Set(result.recommendations.map((item) => item.whyMatch.toldUs.trim()).filter(Boolean)),
  ].slice(0, 3);
  if (told.length) {
    text("Why this person might like these", 13, INK, "bold", 4);
    text(told.join(" "), 11, MUTED, "normal", 8);
  }

  if (draft.mode !== "taste" && draft.cosmicFeedback !== "not_really") {
    const cosmic = buildCosmicProfile(draft.name, draft.birthDate, {
      birthTime: draft.birthTime,
      birthPlace: draft.birthPlace,
    });
    if (cosmic && (cosmic.sunSign || cosmic.lifePath)) {
      heading("Cosmic profile");
      text(
        [cosmic.sunSign, cosmic.lifePath ? `Life path ${cosmic.lifePath}` : ""].filter(Boolean).join(" · "),
        11,
        MUTED,
        "normal",
        4,
      );
      text(cosmic.reading, 11, INK, "normal", 8);
    }
  }

  heading("Recommendations");
  for (const item of result.recommendations) {
    await writeRecommendation(item);
  }

  if (result.unexpected) {
    heading("Something you might not have considered");
    await writeRecommendation(result.unexpected);
  }

  const liked = draft.feedback.filter((item) => item.reaction === "love" || item.reaction === "maybe");
  if (liked.length || draft.savedIdeas.length) {
    heading("Liked");
    for (const item of liked) {
      text(`${item.reaction === "love" ? "Loved" : "Maybe"}: ${item.title}`, 11, INK, "normal", 2);
    }
    for (const title of draft.savedIdeas) {
      if (!liked.some((item) => item.title === title)) text(`Saved: ${title}`, 11, INK, "normal", 2);
    }
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text("NotBuyChance", margin, pageHeight - 28);
    doc.text(`${page} / ${pages}`, pageWidth - margin, pageHeight - 28, { align: "right" });
  }

  return doc;

  async function writeRecommendation(item: Recommendation) {
    if (room() < 190) newPage();
    const image = await loadJpeg(imageUrls(item));
    if (image) {
      const scale = Math.min(220 / image.width, 130 / image.height, 1);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      if (room() < drawHeight + 20) newPage();
      doc.addImage(image.data, "JPEG", margin, y, drawWidth, drawHeight);
      y += drawHeight + 10;
    }
    text(`${item.rank}. ${item.title}`, 14, INK, "bold", 2);
    text(categoryLabel(item.category), 10, ACCENT, "bold", 6);
    if (item.description) text(item.description, 11, INK, "normal", 4);
    const tags = [
      SUITABILITY_LABELS[item.suitability],
      AVAILABILITY_LABELS[item.availabilityStatus],
      ...item.supportingPreferences,
    ].filter(Boolean);
    if (tags.length) text(tags.join(" · "), 10, MUTED, "normal", 6);
    const why = [item.rationale, item.whyMatch.why, item.whyMatch.qloo].filter(Boolean).join(" ");
    if (why) {
      text("Why this suggestion", 11, INK, "bold", 2);
      text(why, 11, INK, "normal", 4);
    }
    if (item.whyMatch.cosmic && draft.mode !== "taste" && draft.cosmicFeedback !== "not_really") {
      text(item.whyMatch.cosmic, 10, MUTED, "normal", 4);
    }
    if (item.price.status === "verified" && item.price.amount != null && item.price.currency) {
      text(`Price: ${formatMoney(item.price.amount, item.price.currency)}`, 10, MUTED, "normal", 4);
    }
    for (const link of lookupLinks(item, draft)) {
      text(`${link.label}. ${link.note}`, 10, MUTED, "normal", 1);
      text(link.href, 9, ACCENT, "normal", 4);
    }
    y += 8;
  }
}

export async function downloadFindings(draft: DiscoveryDraft, result: DiscoveryResult) {
  const doc = await buildFindingsPdf(draft, result);
  doc.save(pdfFilename(draft.name));
}
