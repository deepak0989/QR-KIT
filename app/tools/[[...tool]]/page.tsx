import BusinessTools from "@/components/business-tools";

export default async function BusinessToolsPage({
  params
}: {
  params: Promise<{ tool?: string[] }>;
}) {
  const { tool = [] } = await params;
  return <BusinessTools tool={tool[0]} />;
}
