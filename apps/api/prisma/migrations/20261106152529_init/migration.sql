-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('FILE', 'DIRECTORY');

-- CreateEnum
CREATE TYPE "ResolutionStatus" AS ENUM ('RESOLVED', 'EXTERNAL', 'UNRESOLVED');

-- CreateEnum
CREATE TYPE "ImportKind" AS ENUM ('IMPORT', 'RE_EXPORT', 'DYNAMIC_IMPORT', 'REQUIRE');

-- CreateEnum
CREATE TYPE "SharePermission" AS ENUM ('VIEW', 'EDIT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "githubId" BIGINT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "defaultBranch" TEXT,
    "primaryLanguage" TEXT,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "forks" INTEGER NOT NULL DEFAULT 0,
    "sizeKb" INTEGER NOT NULL DEFAULT 0,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "commitSha" TEXT NOT NULL,
    "branch" TEXT,
    "commitMessage" TEXT,
    "commitAuthor" TEXT,
    "commitDate" TIMESTAMP(3),
    "status" "AnalysisStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "parserVersion" TEXT,
    "analyzerVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileNode" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "parentId" TEXT,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "extension" TEXT,
    "language" TEXT,
    "purpose" TEXT,
    "type" "NodeType" NOT NULL,
    "sizeBytes" BIGINT NOT NULL DEFAULT 0,
    "lineCount" INTEGER,
    "fanIn" INTEGER NOT NULL DEFAULT 0,
    "fanOut" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DependencyEdge" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT,
    "importSource" TEXT NOT NULL,
    "importKind" "ImportKind" NOT NULL,
    "resolution" "ResolutionStatus" NOT NULL,
    "line" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DependencyEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisMetric" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "totalFolders" INTEGER NOT NULL DEFAULT 0,
    "parsedFiles" INTEGER NOT NULL DEFAULT 0,
    "skippedFiles" INTEGER NOT NULL DEFAULT 0,
    "syntaxErrorFiles" INTEGER NOT NULL DEFAULT 0,
    "failedFiles" INTEGER NOT NULL DEFAULT 0,
    "totalNodes" INTEGER NOT NULL DEFAULT 0,
    "totalEdges" INTEGER NOT NULL DEFAULT 0,
    "resolvedEdges" INTEGER NOT NULL DEFAULT 0,
    "externalEdges" INTEGER NOT NULL DEFAULT 0,
    "unresolvedEdges" INTEGER NOT NULL DEFAULT 0,
    "circularDependencies" INTEGER NOT NULL DEFAULT 0,
    "totalSizeBytes" BIGINT NOT NULL DEFAULT 0,
    "languageCounts" JSONB,
    "analysisDurationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Share" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "userId" TEXT,
    "token" TEXT NOT NULL,
    "permission" "SharePermission" NOT NULL DEFAULT 'VIEW',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Share_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_githubId_key" ON "Repository"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_fullName_key" ON "Repository"("fullName");

-- CreateIndex
CREATE INDEX "Repository_ownerId_idx" ON "Repository"("ownerId");

-- CreateIndex
CREATE INDEX "Repository_owner_name_idx" ON "Repository"("owner", "name");

-- CreateIndex
CREATE INDEX "Analysis_repositoryId_createdAt_idx" ON "Analysis"("repositoryId", "createdAt");

-- CreateIndex
CREATE INDEX "Analysis_status_createdAt_idx" ON "Analysis"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Analysis_repositoryId_commitSha_key" ON "Analysis"("repositoryId", "commitSha");

-- CreateIndex
CREATE INDEX "FileNode_analysisId_type_idx" ON "FileNode"("analysisId", "type");

-- CreateIndex
CREATE INDEX "FileNode_analysisId_language_idx" ON "FileNode"("analysisId", "language");

-- CreateIndex
CREATE INDEX "FileNode_parentId_idx" ON "FileNode"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "FileNode_analysisId_path_key" ON "FileNode"("analysisId", "path");

-- CreateIndex
CREATE INDEX "DependencyEdge_analysisId_sourceNodeId_idx" ON "DependencyEdge"("analysisId", "sourceNodeId");

-- CreateIndex
CREATE INDEX "DependencyEdge_analysisId_targetNodeId_idx" ON "DependencyEdge"("analysisId", "targetNodeId");

-- CreateIndex
CREATE INDEX "DependencyEdge_analysisId_resolution_idx" ON "DependencyEdge"("analysisId", "resolution");

-- CreateIndex
CREATE UNIQUE INDEX "DependencyEdge_analysisId_sourceNodeId_importSource_line_im_key" ON "DependencyEdge"("analysisId", "sourceNodeId", "importSource", "line", "importKind");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisMetric_analysisId_key" ON "AnalysisMetric"("analysisId");

-- CreateIndex
CREATE UNIQUE INDEX "Share_token_key" ON "Share"("token");

-- CreateIndex
CREATE INDEX "Share_analysisId_idx" ON "Share"("analysisId");

-- CreateIndex
CREATE INDEX "Share_userId_idx" ON "Share"("userId");

-- AddForeignKey
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileNode" ADD CONSTRAINT "FileNode_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileNode" ADD CONSTRAINT "FileNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FileNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DependencyEdge" ADD CONSTRAINT "DependencyEdge_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DependencyEdge" ADD CONSTRAINT "DependencyEdge_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "FileNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DependencyEdge" ADD CONSTRAINT "DependencyEdge_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "FileNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisMetric" ADD CONSTRAINT "AnalysisMetric_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
