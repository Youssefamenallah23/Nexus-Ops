import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export default function SettingsPage() {
  return (
    <Empty className="py-24">
      <EmptyHeader>
        <EmptyTitle>Settings</EmptyTitle>
        <EmptyDescription>
          Roles, departments, routing rules and LLM provider configuration live here in a later
          milestone. For now, configuration is done through environment variables (see .env.example).
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
