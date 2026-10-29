import type { DiscoveryDraft, Recommendation } from "@/types/discovery";

export interface LookupLink {
  label: string;
  href: string;
  note: string;
}

function searchHref(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function mapsHref(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function lookupLinks(item: Recommendation, draft: Pick<DiscoveryDraft, "city" | "country">): LookupLink[] {
  const links: LookupLink[] = [];
  const source = item.externalSource?.url;
  if (source && /^https:\/\//i.test(source)) {
    links.push({
      label: item.externalSource?.title || "A page from the search",
      href: source,
      note: "From the live search. We didn't book or buy anything.",
    });
  }

  const dining = item.category === "dining";
  const place =
    dining ||
    item.availabilityStatus === "verified_place" ||
    item.availabilityStatus === "verified_event";
  const where = [item.location, draft.city, draft.country].filter(Boolean)[0] || "";
  const query = [item.title, dining ? "restaurant" : item.category === "books" ? "book" : "", where]
    .filter(Boolean)
    .join(" ");

  if (place) {
    links.push({
      label: "Find it on Maps",
      href: mapsHref(query),
      note: "A maps search, not a reservation.",
    });
  }
  links.push({
    label: place ? "Search the web for it" : "Look this up",
    href: searchHref(query),
    note: "A search link so you can find it. Not a store we verified.",
  });
  return links;
}
