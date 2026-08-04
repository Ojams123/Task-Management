import { DocumentsView } from "@/components/documents/documents-view";
import { documents } from "@/lib/mock-data";

export default function DocumentsPage() {
  return <DocumentsView documents={documents} />;
}
