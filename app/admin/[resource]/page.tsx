import { ResourceManager } from "@/components/admin/resource-manager";

export default async function AdminResourcePage({ params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  return <ResourceManager resourceKey={resource} />;
}
