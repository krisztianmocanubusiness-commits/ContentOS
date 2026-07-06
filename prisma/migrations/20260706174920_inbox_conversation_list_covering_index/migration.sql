-- CreateIndex
CREATE INDEX "Conversation_workspaceId_archived_updatedAt_idx" ON "Conversation"("workspaceId", "archived", "updatedAt");
