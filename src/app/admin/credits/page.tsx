"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { DataTable } from "@/components/admin/data-table"
import {
  CreditCard, DollarSign, Users, TrendingUp, TrendingDown, Plus, Minus,
} from "lucide-react"
import { useCreditBalances, useAdjustCredits } from "@/hooks/admin/use-credits"

interface CreditBalance {
  id: string;
  creditsRemaining: number;
  lastSyncedAt: string;
  user: { name: string | null; email: string };
  _count?: { usageHistory: number };
}

export default function AdminCreditsPage() {
  const { data: creditBalances = [], isLoading: loading } = useCreditBalances()
  const adjustCreditsMutation = useAdjustCredits()

  const [selectedUser, setSelectedUser] = useState<CreditBalance | null>(null)
  const [creditAmount, setCreditAmount] = useState("")
  const [adjustmentType, setAdjustmentType] = useState<"add" | "subtract">("add")
  const [dialogOpen, setDialogOpen] = useState(false)

  const totalCredits = (creditBalances as CreditBalance[]).reduce(
    (sum: number, b: CreditBalance) => sum + b.creditsRemaining, 0
  )
  const averageCredits = creditBalances.length
    ? Math.round(totalCredits / creditBalances.length)
    : 0

  const handleAdjustCredits = () => {
    if (!selectedUser || !creditAmount) return
    const amount = parseInt(creditAmount)
    if (isNaN(amount) || amount <= 0) return

    adjustCreditsMutation.mutate({
      balanceId: selectedUser.id,
      amount: adjustmentType === "add" ? amount : -amount,
    }, {
      onSuccess: () => {
        setDialogOpen(false)
        setSelectedUser(null)
        setCreditAmount("")
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Credit Management</h1>
          <p className="text-muted-foreground mt-2">Monitor and manage user credits</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Total Credits</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {totalCredits.toLocaleString()}
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Average Balance</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {averageCredits.toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Active Users</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {creditBalances.length}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Low Balance</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {creditBalances.filter(b => b.creditsRemaining < 10).length}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-500" />
          </div>
        </Card>
      </div>

      <DataTable
        data={creditBalances as unknown as Record<string, unknown>[]}
        columns={[
          {
            key: "user",
            header: "User",
            render: (balance: unknown) => {
              const b = balance as CreditBalance;
              return (
                <div>
                  <p className="font-medium text-foreground">
                    {b.user.name || "No name"}
                  </p>
                  <p className="text-sm text-muted-foreground">{b.user.email}</p>
                </div>
              );
            },
          },
          {
            key: "creditsRemaining",
            header: "Credits Remaining",
            render: (balance: unknown) => {
              const b = balance as CreditBalance;
              return (
                <div className="flex items-center space-x-2">
                  <span className="text-foreground font-medium">
                    {b.creditsRemaining.toLocaleString()}
                  </span>
                  {b.creditsRemaining > 100 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : b.creditsRemaining < 10 ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : null}
                </div>
              );
            },
          },
          {
            key: "usage",
            header: "Usage Count",
            render: (balance: unknown) => {
              const b = balance as CreditBalance;
              return (
                <span className="text-muted-foreground">
                  {b._count?.usageHistory || 0} operations
                </span>
              );
            },
          },
          {
            key: "lastSyncedAt",
            header: "Last Synced",
            render: (balance: unknown) => {
              const b = balance as CreditBalance;
              return (
                <span className="text-muted-foreground">
                  {new Date(b.lastSyncedAt).toLocaleString()}
                </span>
              );
            },
          },
          {
            key: "status",
            header: "Status",
            render: (balance: unknown) => {
              const b = balance as CreditBalance;
              return (
                <Badge
                  variant="outline"
                  className={
                    b.creditsRemaining > 50
                      ? "border-green-500 text-green-500"
                      : b.creditsRemaining > 10
                      ? "border-yellow-500 text-yellow-500"
                      : "border-red-500 text-red-500"
                  }
                >
                  {b.creditsRemaining > 50 ? "Healthy" :
                   b.creditsRemaining > 10 ? "Low" : "Critical"}
                </Badge>
              );
            },
          },
          {
            key: "actions",
            header: "Actions",
            className: "text-right",
            render: (balance: unknown) => {
              const b = balance as CreditBalance;
              return (
                <Dialog open={dialogOpen && selectedUser?.id === b.id} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  setSelectedUser(null);
                  setCreditAmount("");
                }
              }}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUser(b)}
                  >
                    Adjust
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Adjust Credits</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Adjust credit balance for {b.user.name || b.user.email}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Current Balance</Label>
                      <div className="text-2xl font-bold text-foreground">
                        {b.creditsRemaining.toLocaleString()} credits
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Adjustment Type</Label>
                      <div className="flex space-x-2">
                        <Button
                          variant={adjustmentType === "add" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAdjustmentType("add")}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                        <Button
                          variant={adjustmentType === "subtract" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAdjustmentType("subtract")}
                        >
                          <Minus className="h-4 w-4 mr-1" />
                          Subtract
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">
                        Amount
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Enter credit amount"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                        className="pl-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAdjustCredits}
                      className="bg-primary hover:bg-primary/90"
                      disabled={adjustCreditsMutation.isPending}
                    >
                      {adjustCreditsMutation.isPending ? "Applying..." : "Apply Adjustment"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
                </Dialog>
              );
            },
          },
        ]}
        searchable={true}
        searchPlaceholder="Search by user..."
        searchKeys={["user"]}
        loading={loading}
        countLabel="credit balances"
        emptyMessage="No credit balances found"
      />
    </div>
  );
}