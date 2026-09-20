/**
 * Upload validation. The file's real type is decided from its first bytes ("magic numbers"), never
 * from the name or the browser-declared type, and only formats that can't run scripts are allowed
 * (no SVG, HTML or executables).
 */
export type FileKind = "VIDEO" | "AUDIO" | "IMAGE" | "DOCUMENT";

export type SniffedFile = { kind: FileKind; contentType: string; ext: string };

const MB = 1024 * 1024;
export const MAX_BYTES: Record<FileKind, number> = { VIDEO: 200 * MB, AUDIO: 50 * MB, IMAGE: 5 * MB, DOCUMENT: 20 * MB };

const ascii = (b: Uint8Array, start: number, len: number) => String.fromCharCode(...b.slice(start, start + len));
const startsWith = (b: Uint8Array, bytes: number[]) => bytes.every((v, i) => b[i] === v);

/** Identifies an allowed file from its leading bytes, or returns null. */
export function sniffFile(buffer: Uint8Array): SniffedFile | null {
  if (buffer.length < 12) return null;

  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { kind: "IMAGE", contentType: "image/png", ext: "png" };
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return { kind: "IMAGE", contentType: "image/jpeg", ext: "jpg" };
  if (ascii(buffer, 0, 4) === "RIFF" && ascii(buffer, 8, 4) === "WEBP") return { kind: "IMAGE", contentType: "image/webp", ext: "webp" };
  if (ascii(buffer, 0, 4) === "%PDF") return { kind: "DOCUMENT", contentType: "application/pdf", ext: "pdf" };

  if (ascii(buffer, 0, 4) === "RIFF" && ascii(buffer, 8, 4) === "WAVE") return { kind: "AUDIO", contentType: "audio/wav", ext: "wav" };
  if (ascii(buffer, 0, 4) === "OggS") return { kind: "AUDIO", contentType: "audio/ogg", ext: "ogg" };
  if (ascii(buffer, 0, 3) === "ID3" || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)) return { kind: "AUDIO", contentType: "audio/mpeg", ext: "mp3" };

  if (startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3])) return { kind: "VIDEO", contentType: "video/webm", ext: "webm" };
  if (ascii(buffer, 4, 4) === "ftyp") {
    const brand = ascii(buffer, 8, 4);
    if (brand === "M4A " || brand === "M4B ") return { kind: "AUDIO", contentType: "audio/mp4", ext: "m4a" };
    return { kind: "VIDEO", contentType: "video/mp4", ext: "mp4" };
  }
  return null;
}

export type FileCheck = { ok: true; file: SniffedFile } | { ok: false; error: string };

/** Full check for an upload: size, real type, and that the type is one the uploader asked for. */
export function validateUpload(buffer: Uint8Array, size: number, allowedKinds: FileKind[]): FileCheck {
  if (size <= 0) return { ok: false, error: "That file is empty." };
  const sniffed = sniffFile(buffer);
  if (!sniffed) return { ok: false, error: "This file type isn't supported. Use MP4/WebM video, MP3/WAV/OGG/M4A audio, PNG/JPG/WebP images or PDF documents." };
  if (!allowedKinds.includes(sniffed.kind)) return { ok: false, error: `Expected ${allowedKinds.join(" or ").toLowerCase()}, but this is ${sniffed.kind.toLowerCase()}.` };
  if (size > MAX_BYTES[sniffed.kind]) return { ok: false, error: `That ${sniffed.kind.toLowerCase()} is too large (limit ${Math.round(MAX_BYTES[sniffed.kind] / MB)} MB).` };
  return { ok: true, file: sniffed };
}

/** A display-safe version of the original name. */
export function safeFileName(name: string): string {
  // eslint-disable-next-line no-control-regex
  const base = name.split(/[\\/]/).pop()!.replace(/[\u0000-\u001F<>:"|?*]/g, "").trim();
  return (base || "file").slice(0, 120);
}
