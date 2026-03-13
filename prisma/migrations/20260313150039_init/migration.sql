-- CreateEnum
CREATE TYPE "ReconRunKind" AS ENUM ('full_scan', 'market_recon', 'product_creator', 'landing_generator');

-- CreateEnum
CREATE TYPE "ProductReconStatus" AS ENUM ('good', 'attention', 'problem');

-- CreateEnum
CREATE TYPE "MarketInsightKind" AS ENUM ('pain_point', 'trend', 'opportunity');

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopSettings" (
    "shop" TEXT NOT NULL,
    "detectedNiche" TEXT,
    "detectedSubniches" TEXT,
    "personalitySarcasmOn" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSettings_pkey" PRIMARY KEY ("shop")
);

-- CreateTable
CREATE TABLE "ReconRun" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "kind" "ReconRunKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductRecon" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" TEXT,
    "stock" INTEGER,
    "aiCategory" TEXT,
    "score" INTEGER,
    "status" "ProductReconStatus",
    "suggestion" TEXT,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductRecon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketInsight" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "kind" "MarketInsightKind" NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "sources" JSONB,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReconRun_shop_kind_createdAt_idx" ON "ReconRun"("shop", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "ProductRecon_shop_productId_createdAt_idx" ON "ProductRecon"("shop", "productId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketInsight_shop_kind_createdAt_idx" ON "MarketInsight"("shop", "kind", "createdAt");
