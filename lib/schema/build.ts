/* LocalBusiness JSON-LD.
 *
 * This exists because the audit's structured-data check kept saying "no JSON-LD
 * on the page" and then leaving people to work out schema.org on their own,
 * which is not a reasonable thing to ask of someone who runs a plumbing
 * business. It is pure formatting: everything in the output was typed in by the
 * visitor, and the tool invents nothing.
 *
 * THE HONESTY LINE IN THIS TOOL is about what schema does and doesn't do. It is
 * not a ranking trick and it will not conjure a star rating — see the FAQ. In
 * particular there is deliberately NO aggregateRating field here, for the same
 * reason lib/seo.ts refuses one: a rating you type in yourself, unbacked by real
 * reviews on the page, is exactly what earns a manual action. If someone asks
 * for it, the answer is no.
 */

export type Day =
  | "Monday" | "Tuesday" | "Wednesday" | "Thursday"
  | "Friday" | "Saturday" | "Sunday";

export const DAYS: Day[] = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

export type Hours = { day: Day; open: string; close: string; closed: boolean };

export type BusinessInput = {
  /** schema.org type. LocalBusiness is the safe general answer. */
  type: string;
  name: string;
  url: string;
  telephone: string;
  email: string;
  street: string;
  locality: string;
  region: string;
  postalCode: string;
  country: string;
  priceRange: string;
  description: string;
  /** One per line. */
  sameAs: string;
  hours: Hours[];
};

/* The types a small business actually is. Deliberately short — schema.org has
 * hundreds and picking a wrong specific one is worse than a right general one. */
export const BUSINESS_TYPES: { id: string; label: string }[] = [
  { id: "LocalBusiness", label: "General local business" },
  { id: "ProfessionalService", label: "Professional service" },
  { id: "HomeAndConstructionBusiness", label: "Trades / construction" },
  { id: "Store", label: "Shop" },
  { id: "Restaurant", label: "Restaurant or café" },
  { id: "MedicalBusiness", label: "Clinic or medical" },
  { id: "AutomotiveBusiness", label: "Automotive" },
  { id: "HealthAndBeautyBusiness", label: "Salon, spa or fitness" },
];

export const BLANK_HOURS = (): Hours[] =>
  DAYS.map((day) => ({
    day,
    open: "09:00",
    close: "17:00",
    closed: day === "Sunday",
  }));

export const BLANK_BUSINESS = (): BusinessInput => ({
  type: "LocalBusiness",
  name: "",
  url: "",
  telephone: "",
  email: "",
  street: "",
  locality: "",
  region: "",
  postalCode: "",
  country: "IN",
  priceRange: "",
  description: "",
  sameAs: "",
  hours: BLANK_HOURS(),
});

/**
 * Group consecutive days that share hours.
 *
 * Emitting seven separate openingHoursSpecification blocks is valid and
 * unreadable; Google's own examples group them. Grouping also makes an obvious
 * mistake obvious — if Saturday accidentally has weekday hours it shows up as
 * one block instead of two.
 */
function groupHours(hours: Hours[]) {
  const open = hours.filter((h) => !h.closed && h.open && h.close);
  const groups: { days: Day[]; open: string; close: string }[] = [];

  for (const entry of open) {
    const last = groups[groups.length - 1];
    if (last && last.open === entry.open && last.close === entry.close) {
      last.days.push(entry.day);
    } else {
      groups.push({ days: [entry.day], open: entry.open, close: entry.close });
    }
  }
  return groups;
}

export type Issue = { field: string; message: string };

/**
 * What's missing, said plainly.
 *
 * Not validation-for-its-own-sake: each of these is a field that search engines
 * actually use, and the UI shows them as "worth adding" rather than blocking
 * output. A partial block that is honest beats no block at all.
 */
export function issuesFor(input: BusinessInput): Issue[] {
  const issues: Issue[] = [];
  if (!input.name.trim()) issues.push({ field: "name", message: "The business name is required — nothing works without it." });
  if (!input.url.trim()) issues.push({ field: "url", message: "Add your website address so the markup is tied to a real site." });
  if (!input.telephone.trim()) issues.push({ field: "telephone", message: "A phone number is one of the fields most likely to be shown." });
  if (!input.street.trim() || !input.locality.trim()) {
    issues.push({ field: "address", message: "A street and town make this eligible for map results. Leave them out if you have no public address." });
  }
  if (!input.hours.some((h) => !h.closed)) {
    issues.push({ field: "hours", message: "No opening hours set. “Open now” in search results comes from these." });
  }
  if (!input.sameAs.trim()) {
    issues.push({ field: "sameAs", message: "Linking your profiles helps search engines confirm you're the same business they've seen elsewhere." });
  }
  return issues;
}

/** The JSON-LD object. Empty fields are omitted rather than emitted blank —
 *  an empty string is a claim that the value is empty, not that it's unknown. */
export function buildSchema(input: BusinessInput): Record<string, unknown> {
  const trim = (s: string) => s.trim();
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": input.type,
  };

  if (trim(input.name)) node.name = trim(input.name);
  if (trim(input.description)) node.description = trim(input.description);
  if (trim(input.url)) {
    node.url = trim(input.url);
    /* @id anchored to the site's own URL is what lets other markup on the site
     * point at this same entity instead of describing a second business. */
    node["@id"] = `${trim(input.url).replace(/\/$/, "")}/#business`;
  }
  if (trim(input.telephone)) node.telephone = trim(input.telephone);
  if (trim(input.email)) node.email = trim(input.email);
  if (trim(input.priceRange)) node.priceRange = trim(input.priceRange);

  const address: Record<string, string> = { "@type": "PostalAddress" };
  if (trim(input.street)) address.streetAddress = trim(input.street);
  if (trim(input.locality)) address.addressLocality = trim(input.locality);
  if (trim(input.region)) address.addressRegion = trim(input.region);
  if (trim(input.postalCode)) address.postalCode = trim(input.postalCode);
  if (trim(input.country)) address.addressCountry = trim(input.country);
  if (Object.keys(address).length > 1) node.address = address;

  const groups = groupHours(input.hours);
  if (groups.length) {
    node.openingHoursSpecification = groups.map((g) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: g.days.map((d) => `https://schema.org/${d}`),
      opens: g.open,
      closes: g.close,
    }));
  }

  const profiles = input.sameAs
    .split(/\r?\n/)
    .map(trim)
    .filter((line) => /^https?:\/\//.test(line));
  if (profiles.length) node.sameAs = profiles;

  return node;
}

/** The full <script> block, ready to paste into <head>. */
export function toScriptTag(input: BusinessInput): string {
  const json = JSON.stringify(buildSchema(input), null, 2);
  return `<script type="application/ld+json">\n${json}\n</script>`;
}
