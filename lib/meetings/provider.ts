/**
 * A MeetingProvider decides where a class happens. The platform has no video of its own: a class holds a link.
 *
 *  - MANUAL: the teacher pastes a Zoom, Google Meet or Teams link.
 *  - JITSI: the platform makes a private room address on a Jitsi server (free, no account needed). Set
 *    `JITSI_BASE_URL` to use your own server; it defaults to https://meet.jit.si.
 *
 * To add a provider that creates meetings through an API (Zoom, Google Meet...), implement this interface,
 * keep its credentials in environment variables, and register it below. Nothing else needs to change.
 */
export type MeetingRequest = { classId: string; title: string; startsAt: string; durationMinutes: number };

export interface MeetingProvider {
  id: string;
  label: string;
  /** True when the teacher must supply the link themselves. */
  needsUrl: boolean;
  /** A link the teacher typed, checked for this provider; returns an error message or null. */
  validateUrl(url: string): string | null;
  /** The link to use for a class. */
  createMeeting(req: MeetingRequest, typedUrl?: string | null): { url: string };
}

const isWebLink = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

export const manualProvider: MeetingProvider = {
  id: "MANUAL",
  label: "Paste a Zoom, Meet or Teams link",
  needsUrl: true,
  validateUrl: (url) => (isWebLink(url.trim()) ? null : "Add the meeting link, starting with https://"),
  createMeeting: (_req, typedUrl) => ({ url: (typedUrl ?? "").trim() }),
};

function jitsiBase() {
  return (process.env.JITSI_BASE_URL || "https://meet.jit.si").replace(/\/$/, "");
}

export const jitsiProvider: MeetingProvider = {
  id: "JITSI",
  label: "Create a Jitsi room (free, no account)",
  needsUrl: false,
  validateUrl: () => null,
  // The room name includes the class id, which nobody else knows, so the address can't be guessed.
  createMeeting: (req) => ({ url: `${jitsiBase()}/BanglaEnglish-${req.classId.replace(/-/g, "")}` }),
};

const providers: Record<string, MeetingProvider> = { MANUAL: manualProvider, JITSI: jitsiProvider };

export const listMeetingProviders = () => Object.values(providers);
export const getMeetingProvider = (id: string): MeetingProvider | null => providers[id] ?? null;
