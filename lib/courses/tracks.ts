/** Course tracks shown as badges and filters. Client-safe. */
export type Track = "ENGLISH" | "IELTS" | "CAREER";
export const TRACKS: Track[] = ["ENGLISH", "IELTS", "CAREER"];
export const TRACK_LABELS: Record<Track, string> = { ENGLISH: "English", IELTS: "IELTS", CAREER: "English for Career" };
export const trackTone = (track: string): "accent" | "primary" | "success" => (track === "IELTS" ? "accent" : track === "CAREER" ? "success" : "primary");
