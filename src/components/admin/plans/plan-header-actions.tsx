import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface PlanHeaderActionsProps {
  onAddCustomPlan: () => void;
}

export function PlanHeaderActions({
  onAddCustomPlan,
}: PlanHeaderActionsProps) {
  return (
    <div className="flex items-center gap-3 pt-4">
      <Button
        variant="default"
        size="sm"
        onClick={onAddCustomPlan}
      >
        <Plus className="h-4 w-4 mr-2" />
        Adicionar plano
      </Button>
    </div>
  );
}
