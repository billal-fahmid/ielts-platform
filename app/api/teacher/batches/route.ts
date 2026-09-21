import { z } from "zod";
import { audit } from "@/lib/security/audit";
import { createBatch } from "@/lib/services/teaching";
import { teacherRoute } from "@/lib/teaching/route";

const batchSchema = z.object({
  name: z.string().min(1, "Give the batch a name."),
  description: z.string().nullish(),
  courseId: z.string().nullish(),
  capacity: z.number().nullish(),
  startsOn: z.string().nullish(),
  endsOn: z.string().nullish(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export async function POST(req: Request) {
  return teacherRoute(req, { schema: batchSchema, path: "/api/teacher/batches" }, ({ user, body }) => {
    const batch = createBatch(user.id, body);
    audit({ actorId: user.id, actorRole: user.role, action: "batch.create", entityType: "batches", entityId: batch.id }, req);
    return { batch };
  });
}
