import { Package } from "lucide-react";

export function PlanEmptyState() {
  return (
    <div className="text-center py-16">
      <div className="max-w-md mx-auto">
        <div className="flex h-20 w-20 mx-auto mb-6 items-center justify-center rounded-full bg-primary/10">
          <Package className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No plans configured</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Use the button above to create your first subscription plan.
        </p>
        <div className="space-y-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 justify-center">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">1</span>
            <span>Add a new subscription plan</span>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">2</span>
            <span>Set credits, pricing, and features for each plan</span>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">3</span>
            <span>Connect the plan with M-Pesa to process payments</span>
          </div>
        </div>
      </div>
    </div>
  );
}
