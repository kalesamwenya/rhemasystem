const WEBSITE_PAGE_NAMES: Record<string, string> = {
  "/": "Home",
  "/about": "About Emit Academy",
  "/apply": "Apply to Emit Academy",
  "/community": "Community",
  "/contact": "Contact",
  "/events": "Events",
  "/faculty": "Faculty",
  "/fee-structure": "Fees and Payment",
  "/offered-programs": "Offered Programs",
  "/partnerships/apply": "Partnership Application",
  "/privacy": "Privacy Policy",
  "/terms": "Terms and Conditions",
  "/testimony": "Testimonials",
};

function titleCaseSegment(segment: string) {
  return segment
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getWebsitePageName(pagePath: string) {
  const normalizedPath = pagePath.length > 1 ? pagePath.replace(/\/+$/, "") : pagePath;
  const knownPageName = WEBSITE_PAGE_NAMES[normalizedPath];
  if (knownPageName) return knownPageName;

  const segments = normalizedPath.split("/").filter(Boolean);
  if (segments.length === 2 && segments[0] === "events") return "Event Details";
  if (!segments.length) return "Home";

  return segments.map(titleCaseSegment).join(" / ");
}
