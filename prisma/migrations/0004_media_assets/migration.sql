-- CreateEnum
CREATE TYPE "media_purpose" AS ENUM ('LOGO', 'COVER', 'HERO', 'FAVICON', 'WEBSITE_SECTION', 'MENU_ITEM');

-- CreateEnum
CREATE TYPE "media_status" AS ENUM ('READY', 'DELETED');

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "purpose" "media_purpose" NOT NULL,
    "status" "media_status" NOT NULL DEFAULT 'READY',
    "provider_file_id" VARCHAR(64) NOT NULL,
    "storage_path" VARCHAR(255) NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "content_type" VARCHAR(40) NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "original_filename" VARCHAR(120),
    "uploaded_by_user_id" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_provider_file_id_key" ON "media_assets"("provider_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_storage_path_key" ON "media_assets"("storage_path");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_url_key" ON "media_assets"("url");

-- CreateIndex
CREATE INDEX "media_assets_tenant_id_purpose_status_idx" ON "media_assets"("tenant_id", "purpose", "status");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_tenant_id_id_key" ON "media_assets"("tenant_id", "id");

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Invariants the application also enforces (SC-FILE-01, ADR-017 §3): allowed types only, ≤ 5 MB, ≤ 4096 px,
-- a deleted asset carries its deletion time and a live one does not.
ALTER TABLE "media_assets"
  ADD CONSTRAINT "media_assets_content_type_check" CHECK ("content_type" IN ('image/jpeg', 'image/png', 'image/webp')),
  ADD CONSTRAINT "media_assets_byte_size_check" CHECK ("byte_size" BETWEEN 1 AND 5242880),
  ADD CONSTRAINT "media_assets_dimensions_check" CHECK ("width" BETWEEN 1 AND 4096 AND "height" BETWEEN 1 AND 4096),
  ADD CONSTRAINT "media_assets_url_https_check" CHECK ("url" LIKE 'https://%'),
  ADD CONSTRAINT "media_assets_deleted_at_check" CHECK (("status" = 'DELETED') = ("deleted_at" IS NOT NULL));
