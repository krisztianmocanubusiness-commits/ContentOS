-- CreateIndex
CREATE INDEX "Asset_workspaceId_idx" ON "Asset"("workspaceId");

-- CreateIndex
CREATE INDEX "CalendarEvent_workspaceId_idx" ON "CalendarEvent"("workspaceId");

-- CreateIndex
CREATE INDEX "ContentComment_contentItemId_idx" ON "ContentComment"("contentItemId");

-- CreateIndex
CREATE INDEX "ContentItem_workspaceId_idx" ON "ContentItem"("workspaceId");

-- CreateIndex
CREATE INDEX "Conversation_workspaceId_idx" ON "Conversation"("workspaceId");

-- CreateIndex
CREATE INDEX "Deal_workspaceId_idx" ON "Deal"("workspaceId");

-- CreateIndex
CREATE INDEX "InboxMessage_conversationId_idx" ON "InboxMessage"("conversationId");

-- CreateIndex
CREATE INDEX "ReviewEvent_contentItemId_idx" ON "ReviewEvent"("contentItemId");

-- CreateIndex
CREATE INDEX "SocialAccount_workspaceId_idx" ON "SocialAccount"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_workspaceId_idx" ON "WorkspaceMembership"("workspaceId");
