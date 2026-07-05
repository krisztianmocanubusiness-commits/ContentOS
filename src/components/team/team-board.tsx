"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PermissionButton } from "@/components/permissions/permission-button";
import { RolePreviewSelect } from "@/components/permissions/role-preview-select";
import { changeRoleAction, inviteMemberAction, removeMemberAction } from "@/lib/team-actions";
import type { TeamMemberRow } from "@/lib/team-data";
import { ROLE_DESCRIPTIONS, ROLES } from "@/lib/permissions";
import { usePermission } from "@/hooks/use-permission";
import type { TeamRole } from "@/lib/mock-data";

export function TeamBoard({
  workspaceSlug,
  workspaceName,
  currentUserId,
  initialMembers,
}: {
  workspaceSlug: string;
  workspaceName: string;
  currentUserId: string;
  initialMembers: TeamMemberRow[];
}) {
  const router = useRouter();
  const canManageTeam = usePermission("manageTeam");
  const [members, setMembers] = React.useState(initialMembers);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<TeamRole>("Editor");
  const [confirmingRemoveId, setConfirmingRemoveId] = React.useState<string | null>(null);
  const [pendingMembershipId, setPendingMembershipId] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const [prevInitialMembers, setPrevInitialMembers] = React.useState(initialMembers);
  if (initialMembers !== prevInitialMembers) {
    setPrevInitialMembers(initialMembers);
    setMembers(initialMembers);
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await inviteMemberAction(workspaceSlug, { email: trimmed, role: inviteRole });
      if (result.ok) {
        toast.success(`Invited ${result.data.email}.`);
        setEmail("");
        setInviteRole("Editor");
        setInviteOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function updateRole(membershipId: string, newRole: TeamRole) {
    setPendingMembershipId(membershipId);
    startTransition(async () => {
      const result = await changeRoleAction(workspaceSlug, membershipId, newRole);
      if (result.ok) {
        toast.success(`Updated ${result.data.name}'s role to ${newRole}.`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
      setPendingMembershipId(null);
    });
  }

  function removeMember(membershipId: string, name: string) {
    setPendingMembershipId(membershipId);
    startTransition(async () => {
      const result = await removeMemberAction(workspaceSlug, membershipId);
      if (result.ok) {
        toast.success(`Removed ${name} from the workspace.`);
        setConfirmingRemoveId(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
      setPendingMembershipId(null);
    });
  }

  return (
    <div>
      <PageHeader
        title="Team"
        description={`Manage who has access to ${workspaceName}.`}
        action={
          <div className="flex items-center gap-2">
            <RolePreviewSelect />
            <PermissionButton permission="manageTeam" onClick={() => setInviteOpen(true)}>
              <UserPlus />
              Invite member
            </PermissionButton>
          </div>
        }
      />

      {members.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-1 p-10 text-center">
          <p className="text-sm font-medium">No team members yet</p>
          <p className="text-sm text-muted-foreground">
            Invite someone to start collaborating on {workspaceName}.
          </p>
        </Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden py-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last active</TableHead>
                  {canManageTeam && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const isSelf = member.userId === currentUserId;
                  const rowPending = isPending && pendingMembershipId === member.membershipId;
                  return (
                    <TableRow key={member.membershipId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {member.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {member.name}
                              {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(You)</span>}
                            </span>
                            <span className="text-xs text-muted-foreground">{member.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {canManageTeam && !isSelf ? (
                          <Select
                            value={member.role}
                            onValueChange={(value) => updateRole(member.membershipId, value as TeamRole)}
                            disabled={rowPending}
                          >
                            <SelectTrigger size="sm" className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-muted-foreground">{member.role}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.status === "Active" ? "success" : "outline"}>
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {member.lastActive ?? "No activity yet"}
                        </span>
                      </TableCell>
                      {canManageTeam && (
                        <TableCell>
                          {confirmingRemoveId === member.membershipId ? (
                            <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={rowPending}
                                onClick={() => setConfirmingRemoveId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={rowPending}
                                onClick={() => removeMember(member.membershipId, member.name)}
                              >
                                {rowPending ? <Loader2 className="size-4 animate-spin" /> : "Remove"}
                              </Button>
                            </div>
                          ) : !isSelf ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => setConfirmingRemoveId(member.membershipId)}
                              aria-label={`Remove ${member.name}`}
                            >
                              <X className="size-4" />
                            </Button>
                          ) : null}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <div className="flex flex-col gap-3 md:hidden">
            {members.map((member) => {
              const isSelf = member.userId === currentUserId;
              const rowPending = isPending && pendingMembershipId === member.membershipId;
              return (
                <Card key={member.membershipId} className="flex flex-col gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">
                        {member.name}
                        {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(You)</span>}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">{member.email}</span>
                    </div>
                    {canManageTeam && !isSelf && confirmingRemoveId !== member.membershipId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 shrink-0"
                        onClick={() => setConfirmingRemoveId(member.membershipId)}
                        aria-label={`Remove ${member.name}`}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>

                  {confirmingRemoveId === member.membershipId ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-muted-foreground">
                        Remove {member.name} from {workspaceName}? This can&apos;t be undone.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          disabled={rowPending}
                          onClick={() => setConfirmingRemoveId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          className="flex-1"
                          disabled={rowPending}
                          onClick={() => removeMember(member.membershipId, member.name)}
                        >
                          {rowPending ? <Loader2 className="size-4 animate-spin" /> : "Remove"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      {canManageTeam && !isSelf ? (
                        <Select
                          value={member.role}
                          onValueChange={(value) => updateRole(member.membershipId, value as TeamRole)}
                          disabled={rowPending}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm text-muted-foreground">{member.role}</span>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {member.lastActive ?? "No activity yet"}
                        </span>
                        <Badge variant={member.status === "Active" ? "success" : "outline"}>
                          {member.status}
                        </Badge>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription>
              Invite someone to {workspaceName}. They&apos;ll show up as pending until they
              accept.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="teammate@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as TeamRole)}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[inviteRole]}</p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && pendingMembershipId === null ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Send invite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
