import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export default function WorkflowsPage() {
  return (
    <Empty className="py-24">
      <EmptyHeader>
        <EmptyTitle>Workflow automation arrives in Milestone 4</EmptyTitle>
        <EmptyDescription>
          Approved documents will trigger n8n webhooks for notifications, task creation and
          reminders. n8n is already running in Docker Compose on port 5678.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
