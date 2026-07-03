export default function NoWorkspacePage() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-2 bg-background text-center">
      <p className="text-sm font-medium">No workspaces yet</p>
      <p className="text-sm text-muted-foreground">
        Your account isn&apos;t a member of any workspace.
      </p>
    </div>
  );
}
