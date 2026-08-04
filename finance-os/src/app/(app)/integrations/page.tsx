import { IntegrationsGrid } from "@/components/integrations/integrations-grid";
import { integrations } from "@/lib/mock-data";

export default function IntegrationsPage() {
  return <IntegrationsGrid integrations={integrations} />;
}
