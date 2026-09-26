/** Small client-safe helpers for admin-edited content. */

export type ContentLink = { label: string; url: string };

/**
 * Turns lines like "Student visa (GOV.UK) | https://www.gov.uk/student-visa" into links. Only https addresses are
 * accepted, so an editor can't add a script or file link. Returns the links and any lines that were not valid.
 */
export function parseLinkLines(lines: readonly string[] | null | undefined): { links: ContentLink[]; invalid: string[] } {
  const links: ContentLink[] = [];
  const invalid: string[] = [];
  for (const raw of lines ?? []) {
    const line = String(raw).trim();
    if (!line) continue;
    const at = line.lastIndexOf("|");
    const label = at > 0 ? line.slice(0, at).trim() : "";
    const url = at > 0 ? line.slice(at + 1).trim() : "";
    let ok = false;
    try {
      ok = !!label && new URL(url).protocol === "https:";
    } catch {
      ok = false;
    }
    if (ok) links.push({ label, url });
    else invalid.push(line);
  }
  return { links, invalid };
}
