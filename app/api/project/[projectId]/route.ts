import { getProjectState } from "@/lib/app/project";
import { route } from "@/lib/app/route";

export const dynamic = "force-dynamic";

export const GET = route<{ projectId: string }>(async (_req, { projectId }) => getProjectState(projectId));
