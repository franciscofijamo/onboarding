"use client";

import React from "react";

import { useState } from "react";
import { cn, formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import {
  MoreVertical,
  UserPlus,
  Mail,
  Calendar,
  CreditCard,
  Edit,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useAdminUsers,
  useUpdateUserCredits,
  useDeactivateUser,
  useActivateUser,
  useEditUser,
  useSyncFromClerk,
  type User
} from "@/hooks/admin/use-admin-users";
import { useAdminPlans } from "@/hooks/use-admin-plans";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminInvitations,
  useInviteUser,
  useResendInvitation,
  useRevokeInvitation,
  type Invitation
} from "@/hooks/admin/use-admin-invitations";

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [activeTab, setActiveTab] = useState("users");
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPlanId, setEditPlanId] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data: usersData, isLoading: usersLoading } = useAdminUsers({
    page: 1,
    pageSize: 1000,
    search: searchTerm || undefined,
    includeUsageCount: true
  });

  const { data: invitationsData, isLoading: invitationsLoading } = useAdminInvitations();
  const { data: plansData } = useAdminPlans();

  const updateCreditsMutation = useUpdateUserCredits();
  const deactivateUserMutation = useDeactivateUser();
  const activateUserMutation = useActivateUser();
  const editUserMutation = useEditUser();
  const syncFromClerkMutation = useSyncFromClerk();
  const inviteUserMutation = useInviteUser();
  const resendInvitationMutation = useResendInvitation();
  const revokeInvitationMutation = useRevokeInvitation();

  const users = usersData?.users || [];
  const pendingInvites = invitationsData?.invitations || [];
  const plans = plansData?.plans || [];
  const loading = usersLoading;
  const invLoading = invitationsLoading;

  const runSync = () => {
    syncFromClerkMutation.mutate({}, {
      onSuccess: () => {
        setConfirmOpen(false);
      }
    });
  };

  const promptAndUpdateCredits = async (userId: string, current?: number) => {
    const prefix = 'Set new credit balance'
    const suffix = typeof current === 'number' ? ` (current: ${current})` : ''
    const message = `${prefix}${suffix}:`
    const input = window.prompt(
      message,
      typeof current === 'number' ? String(current) : ''
    )
    if (input == null) return
    const value = Number(input)
    if (!Number.isFinite(value) || value < 0) {
      alert('Please enter a valid non-negative number')
      return
    }
    updateCreditsMutation.mutate({ userId, credits: Math.floor(value) });
  }

  const handleDeactivateUser = (userId: string) => {
    if (!confirm("Are you sure you want to deactivate this user?")) return;
    deactivateUserMutation.mutate(userId);
  };

  const openEdit = (user: User) => {
    setEditId(user.id);
    setEditName(user.name || "");
    setEditEmail(user.email || "");
    setEditPlanId(user.currentPlanId || "");
    setEditOpen(true);
  }

  const saveEdit = () => {
    if (!editId) return;
    editUserMutation.mutate(
      {
        userId: editId,
        name: editName,
        email: editEmail,
        planId: editPlanId || undefined
      },
      {
        onSuccess: () => {
          setEditOpen(false);
          setEditId(null);
        }
      }
    );
  }

  const handleInviteUser = () => {
    if (!inviteEmail) return;
    inviteUserMutation.mutate(
      { email: inviteEmail, name: inviteName },
      {
        onSuccess: () => {
          setInviteOpen(false);
          setInviteEmail('');
          setInviteName('');
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground mt-2">Manage all registered users</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={()=> setConfirmOpen(true)}>Sync from Clerk</Button>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sync Users from Clerk</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 text-left">
                    <p className="text-sm">This action will:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Create Clerk users that don't exist in the database yet</li>
                      <li>Update name and email of existing users</li>
                      <li>Create credit balance (0 by default) for new users</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                      Note: Plans and credits are managed by the payment system, not by Clerk.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={runSync} disabled={syncFromClerkMutation.isPending}>
                  {syncFromClerkMutation.isPending ? 'Syncing...' : 'Sync' }
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-foreground">Invite User</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Send an invitation to join via email. If the user already exists, we'll ensure they appear in the list.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">Email</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    placeholder="user@example.com"
                    className="pl-3"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inviteName">Name (optional)</Label>
                  <Input
                    id="inviteName"
                    placeholder="Jane Doe"
                    className="pl-3"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setInviteOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={handleInviteUser}
                  disabled={inviteUserMutation.isPending}
                >
                  {inviteUserMutation.isPending ? 'Sending...' : 'Send Invite'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users">All Users</TabsTrigger>
          <TabsTrigger value="invites">Pending Invitations</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <DataTable
            data={users as unknown as Record<string, unknown>[]}
            columns={[
              {
                key: "user",
                header: "User",
                render: (item: unknown) => {
                  const user = item as User;
                  return (
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {(user.name ? user.name.charAt(0) : (user.email || '').charAt(0)).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.name || "No name"}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  );
                },
              },
              {
                key: "credits",
                header: "Credits",
                render: (item: unknown) => {
                  const user = item as User;
                  return (
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">
                        {user.creditBalance?.creditsRemaining || 0}
                      </span>
                    </div>
                  );
                },
              },
              {
                key: "usage",
                header: "Usage",
                render: (item: unknown) => {
                  const user = item as User;
                  return (
                    <span className="text-muted-foreground">
                      {user._count?.usageHistory || 0} operations
                    </span>
                  );
                },
              },
              {
                key: "createdAt",
                header: "Joined",
                render: (item: unknown) => {
                  const user = item as User;
                  return (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </span>
                    </div>
                  );
                },
              },
              {
                key: "status",
                header: "Status",
                render: (item: unknown) => {
                  const user = item as User;
                  return (
                    user.isActive !== false ? (
                      <Badge variant="outline" className="border-green-500 text-green-500">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="border-gray-500 text-gray-400">Inactive</Badge>
                    )
                  );
                },
              },
              {
                key: "actions",
                header: "Actions",
                className: "text-right",
                render: (item: unknown) => {
                  const user = item as User;
                  return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(user)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => promptAndUpdateCredits(user.id, user.creditBalance?.creditsRemaining)}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Adjust Credits
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-gray-300 hover:text-white" onClick={() => { if (user.email) window.location.href = `mailto:${user.email}` }}>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Email
                        </DropdownMenuItem>
                        {user.isActive === false ? (
                          <DropdownMenuItem
                            className="text-green-400 hover:text-green-300"
                            onClick={() => activateUserMutation.mutate(user.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Activate User
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-red-400 hover:text-red-300"
                            onClick={() => handleDeactivateUser(user.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Deactivate User
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                },
              },
            ]}
            searchable={true}
            searchPlaceholder="Search users..."
            searchKeys={["name", "email"]}
            searchTerm={searchTerm}
            onSearch={setSearchTerm}
            loading={loading}
            countLabel="users"
            emptyMessage="No users found"
          />
        </TabsContent>

        <TabsContent value="invites">
          <DataTable
            data={pendingInvites as unknown as Record<string, unknown>[]}
            columns={[
              {
                key: "emailAddress",
                header: "Email",
                render: (item: unknown) => {
                  const inv = item as Invitation;
                  return <span className="text-foreground">{inv.emailAddress}</span>;
                },
              },
              {
                key: "status",
                header: "Status",
                render: (item: unknown) => {
                  const inv = item as Invitation;
                  const status = (inv.status || '').toLowerCase()
                  const badgeClass = status === 'accepted' ? 'bg-green-500/20 text-green-300' : status === 'revoked' ? 'bg-red-500/20 text-red-300' : status === 'expired' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-blue-500/20 text-blue-300'
                  return (
                    <span className={`px-2 py-1 rounded text-xs ${badgeClass}`}>
                      {status || 'pending'}
                    </span>
                  );
                },
              },
              {
                key: "createdAt",
                header: "Invited",
                render: (item: unknown) => {
                  const inv = item as Invitation;
                  return (
                    <span className="text-muted-foreground">
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleString() : '-'}
                    </span>
                  );
                },
              },
              {
                key: "expiresAt",
                header: "Expires",
                render: (item: unknown) => {
                  const inv = item as Invitation;
                  return (
                    <span className="text-muted-foreground">
                      {inv.expiresAt ? new Date(inv.expiresAt).toLocaleString() : '-'}
                    </span>
                  );
                },
              },
              {
                key: "actions",
                header: "Actions",
                className: "text-right",
                render: (item: unknown) => {
                  const inv = item as Invitation;
                  const status = (inv.status || '').toLowerCase()
                  const disabled = status === 'accepted' || status === 'revoked' || status === 'expired'
                  return (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={disabled || resendInvitationMutation.isPending}
                        onClick={() => resendInvitationMutation.mutate(inv.id)}
                      >
                        {resendInvitationMutation.isPending ? 'Resending...' : 'Resend'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={disabled || revokeInvitationMutation.isPending}
                        onClick={() => {
                          if (!confirm('Revoke this invitation?')) return;
                          revokeInvitationMutation.mutate(inv.id);
                        }}
                      >
                        {revokeInvitationMutation.isPending ? 'Revoking...' : 'Revoke'}
                      </Button>
                    </div>
                  );
                },
              },
            ]}
            searchable={false}
            loading={invLoading}
            countLabel="invitations"
            emptyMessage="No pending invitations"
            headerContent={
              <Button
                variant="outline"
                onClick={() => {}}
                disabled={invLoading}
              >
                {invLoading ? 'Refreshing...' : 'Refresh'}
              </Button>
            }
          />
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={(o)=>{ setEditOpen(o); if(!o){ setEditId(null) } }}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Edit User</DialogTitle>
            <DialogDescription className="text-gray-400">Update user profile information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName" className="text-gray-300">Name</Label>
              <Input id="editName" className="bg-gray-900 border-gray-700 text-white" value={editName} onChange={(e)=>setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail" className="text-gray-300">Email</Label>
              <Input id="editEmail" type="email" className="bg-gray-900 border-gray-700 text-white" value={editEmail} onChange={(e)=>setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPlan" className="text-gray-300">Plan</Label>
              <Select value={editPlanId || "none"} onValueChange={(val) => setEditPlanId(val === "none" ? "" : val)}>
                <SelectTrigger id="editPlan" className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="none" className="text-gray-300">No plan</SelectItem>
                  {plans.filter(p => p.active).map((plan) => (
                    <SelectItem key={plan.id} value={plan.id} className="text-white">
                      {plan.name} ({plan.credits} credits)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Changing the plan will automatically update the user's credits
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={saveEdit}
              disabled={editUserMutation.isPending}
            >
              {editUserMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
