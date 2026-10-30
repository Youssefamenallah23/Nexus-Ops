import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export default function CopilotPage() {
  return (
    <Empty className="py-24">
      <EmptyHeader>
        <EmptyTitle>AI Copilot arrives in Milestone 3</EmptyTitle>
        <EmptyDescription>
          A RAG-powered assistant answering from approved internal documents, with citations
          and role-based access. The pgvector schema is already in place.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
