import { z } from "zod";
import { setLeaderboardVisibility } from "@/lib/services/challenges";
import { memberRoute } from "@/lib/community/route";

const schema = z.object({ visibility: z.enum(["ANONYMOUS", "NAME", "HIDDEN"]) });

/** Chooses how the student appears on leaderboards: anonymous, first name and initial, or hidden. */
export async function POST(req: Request) {
  return memberRoute(req, { schema, path: "/api/growth/leaderboard-privacy", roles: ["STUDENT"] }, ({ user, body }) => {
    setLeaderboardVisibility(user.id, body.visibility);
    return { visibility: body.visibility };
  });
}
