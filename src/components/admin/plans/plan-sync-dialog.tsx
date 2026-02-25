import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import type { SyncPreview } from "./types";

interface PlanSyncDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  syncPreview: SyncPreview | null;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming: boolean;
}

export function PlanSyncDialog({
  isOpen,
  onOpenChange,
  syncPreview,
  onConfirm,
  onCancel,
  isConfirming,
}: PlanSyncDialogProps) {
  const previewNewCount = syncPreview?.previewItems.filter(item => !item.exists).length ?? 0;
  const previewExistingCount = syncPreview?.previewItems.filter(item => item.exists).length ?? 0;
  const previewMissingCount = syncPreview?.missing.length ?? 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onCancel();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Sync plans from Clerk</DialogTitle>
          <DialogDescription>
            Review the plans found before applying the sync.
          </DialogDescription>
        </DialogHeader>

        {syncPreview ? (
          <div className="space-y-6">
            <div className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/20 p-3 text-sm">
              <div className="flex flex-wrap gap-4">
                <span>New: <strong>{previewNewCount}</strong></span>
                <span>Updates: <strong>{previewExistingCount}</strong></span>
                <span>Missing from Clerk: <strong>{previewMissingCount}</strong></span>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {syncPreview.previewItems.map(({ plan, exists }) => (
                <div key={plan.id} className="flex items-center justify-between rounded-lg border border-dashed border-muted-foreground/40 bg-background px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{plan.name || 'Unnamed plan'}</p>
                    <p className="text-xs text-muted-foreground font-mono">{plan.id}</p>
                  </div>
                  <Badge variant={exists ? 'outline' : 'default'}>
                    {exists ? 'Update' : 'New'}
                  </Badge>
                </div>
              ))}
            </div>

            {previewMissingCount > 0 && (
              <div className="space-y-2 rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-200">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  These existing plans will be marked as inactive:
                </div>
                <ul className="list-disc space-y-1 pl-5">
                  {syncPreview.missing.slice(0, 6).map((item) => (
                    <li key={item.id}>{item.name || item.id}</li>
                  ))}
                  {previewMissingCount > 6 && (
                    <li className="italic">... and {previewMissingCount - 6} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center py-10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isConfirming}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!syncPreview || isConfirming}>
            {isConfirming ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                Syncing...
              </>
            ) : (
              'Confirm sync'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
