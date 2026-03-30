-- CreateTable
CREATE TABLE "AiCallLog" (
    "id" TEXT NOT NULL,
    "nodeName" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "output" TEXT NOT NULL,
    "projectId" TEXT,
    "userId" TEXT,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiCallLog_nodeName_idx" ON "AiCallLog"("nodeName");

-- CreateIndex
CREATE INDEX "AiCallLog_createdAt_idx" ON "AiCallLog"("createdAt");

-- CreateIndex
CREATE INDEX "AiCallLog_projectId_idx" ON "AiCallLog"("projectId");
