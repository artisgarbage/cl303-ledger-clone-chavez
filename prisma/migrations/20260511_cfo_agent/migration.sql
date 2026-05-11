-- CFO Agent (Margot Hale) schema
-- Adds Conversation, Message, PersonaConfig tables for conversational financial analysis

-- Create enums
CREATE TYPE "ChatSurface" AS ENUM ('WEB', 'SLACK');
CREATE TYPE "ChatMode" AS ENUM ('INTERNAL_CFO', 'PROPOSAL_BIZDEV', 'BOARD_INVESTOR');
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'TOOL', 'SYSTEM');

-- CreateTable: Conversation
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "surface" "ChatSurface" NOT NULL,
    "mode" "ChatMode" NOT NULL DEFAULT 'INTERNAL_CFO',
    "slackChannel" TEXT,
    "slackThreadTs" TEXT,
    "title" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Message
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" JSONB NOT NULL,
    "modeAtTurn" "ChatMode" NOT NULL,
    "redactionEvents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PersonaConfig
CREATE TABLE "PersonaConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "voiceOverrides" JSONB,
    "toolOverrides" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonaConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_companyId_userId_updatedAt_idx" ON "Conversation"("companyId", "userId", "updatedAt");
CREATE INDEX "Conversation_slackChannel_slackThreadTs_idx" ON "Conversation"("slackChannel", "slackThreadTs");
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE UNIQUE INDEX "PersonaConfig_companyId_key" ON "PersonaConfig"("companyId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonaConfig" ADD CONSTRAINT "PersonaConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
