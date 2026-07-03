"use client";

import * as React from "react";
import { UserPlus, X } from "lucide-react";

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
import {
  teamMembers as seedTeamMembers,
  type TeamMember,
  type TeamRole,
} from "@/lib/mock-data";
import { ROLE_DESCRIPTIONS, ROLES } from "@/lib/permissions";
import { usePermission } from "@/hooks/use-permission";
import { useWorkspace } from "@/context/workspace-context";
import { initialsFromName } from "@/lib/naming";

function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  const words = local.split(/[.\-_]+/).filter(Boolean);
  if (words.length === 0) return email;
  return words
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export default function TeamPage() {
  const { activeWorkspace } = useWorkspace();
  const canManageTeam = usePermission("manageTeam");
  const [members, setMembers] = React.useState(seedTeamMembers);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<TeamRole>("Editor");

  const workspaceMembers = members.filter(
    (member) => member.workspaceId === activeWorkspace.id
  );

  function updateRole(memberId: string, role: TeamRole) {
    setMembers((prev) =>
      prev.map((member) => (member.id === memberId ? { ...member, role } : member))
    );
  }

  function removeMember(memberId: string) {
    setMembers((prev) => prev.filter((member) => member.id !== memberId));
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    const name = nameFromEmail(trimmed);
    const newMember: TeamMember = {
      id: `t-${Date.now().toString(36)}`,
      workspaceId: activeWorkspace.id,
      name,
      email: trimmed,
      role: inviteRole,
      status: "Invited",
      initials: initialsFromName(name),
    };
    setMembers((prev) => [...prev, newMember]);
    setEmail("");
    setInviteRole("Editor");
    setInviteOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Team"
        description={`Manage who has access to ${activeWorkspace.name}.`}
        action={
          <div className="flex items-center gap-2">
            <RolePreviewSelect />
            <PermissionButton
              permission="manageTeam"
              onClick={() => setInviteOpen(true)}
            >
              <UserPlus />
              Invite member
            </PermissionButton>
          </div>
        }
      />

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              {canManageTeam && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {workspaceMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{member.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {member.email}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {canManageTeam ? (
                    <Select
                      value={member.role}
                      onValueChange={(value) => updateRole(member.id, value as TeamRole)}
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
                {canManageTeam && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => removeMember(member.id)}
                      aria-label={`Remove ${member.name}`}
                    >
                      <X className="size-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription>
              Invite someone to {activeWorkspace.name}. They&apos;ll show up as
              pending until they accept.
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
              <p className="text-xs text-muted-foreground">
                {ROLE_DESCRIPTIONS[inviteRole]}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Send invite</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
