import { Cockpit } from "@/components/Cockpit";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <Cockpit projectId={projectId} />;
}
