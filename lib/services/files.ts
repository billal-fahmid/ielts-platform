import { db } from "@/lib/db";
import { uploadedFiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { getStorage } from "@/lib/storage";
import { safeFileName, validateUpload, type FileKind } from "@/lib/storage/validate";

export type Visibility = "PUBLIC" | "MEMBERS" | "PRIVATE";
export type UploadedFile = typeof uploadedFiles.$inferSelect;

export function getFile(id: string) {
  return db.select().from(uploadedFiles).where(eq(uploadedFiles.id, id)).get();
}

/** Where a file can be reached from. Always this relative path, never a storage path. */
export const fileUrl = (id: string) => `/api/files/${id}`;

/**
 * Validates and stores an upload. The type comes from the file's real bytes; the stored key is
 * generated here (never derived from the user's file name).
 */
export async function saveUpload(input: { ownerId: string; data: Uint8Array; originalName: string; allowedKinds: FileKind[]; visibility: Visibility }) {
  const check = validateUpload(input.data, input.data.length, input.allowedKinds);
  if (!check.ok) return check;

  const id = newId();
  const now = new Date();
  const key = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${id}.${check.file.ext}`;
  await getStorage().put(key, input.data);

  db.insert(uploadedFiles)
    .values({
      id,
      ownerId: input.ownerId,
      kind: check.file.kind,
      originalName: safeFileName(input.originalName),
      contentType: check.file.contentType,
      size: input.data.length,
      storageKey: key,
      visibility: input.visibility,
    })
    .run();
  return { ok: true as const, file: getFile(id)!, url: fileUrl(id) };
}

export async function deleteFile(id: string) {
  const file = getFile(id);
  if (!file) return false;
  await getStorage().delete(file.storageKey);
  db.delete(uploadedFiles).where(eq(uploadedFiles.id, id)).run();
  return true;
}
