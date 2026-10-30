import { cookies } from "next/headers";
import { DocumentDetail } from "./document-detail";

export default async function DocumentDetailPage() {
  await cookies(); // opts this route into dynamic rendering (auth is cookie-based)
  return <DocumentDetail />;
}
