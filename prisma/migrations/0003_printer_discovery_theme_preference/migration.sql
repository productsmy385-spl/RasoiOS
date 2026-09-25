-- 0003 (2026-09-25): console theme preference per user (RASOIOS-ADR-016) and console-requested LAN printer
-- discovery (RASOIOS-ADR-015). Additive only: new enums, a defaulted column, a new tenant-owned table.
-- CreateEnum
CREATE TYPE "theme_preference" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "printer_discovery_status" AS ENUM ('REQUESTED', 'RUNNING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "theme_preference" "theme_preference" NOT NULL DEFAULT 'DARK';

-- CreateTable
CREATE TABLE "printer_discoveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "print_agent_id" UUID NOT NULL,
    "status" "printer_discovery_status" NOT NULL DEFAULT 'REQUESTED',
    "results" JSONB,
    "error_code" VARCHAR(40),
    "requested_by_user_id" UUID NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "printer_discoveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "printer_discoveries_tenant_id_print_agent_id_status_idx" ON "printer_discoveries"("tenant_id", "print_agent_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "printer_discoveries_tenant_id_id_key" ON "printer_discoveries"("tenant_id", "id");

-- AddForeignKey
ALTER TABLE "printer_discoveries" ADD CONSTRAINT "printer_discoveries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "printer_discoveries" ADD CONSTRAINT "printer_discoveries_tenant_id_print_agent_id_fkey" FOREIGN KEY ("tenant_id", "print_agent_id") REFERENCES "print_agents"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "printer_discoveries" ADD CONSTRAINT "printer_discoveries_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

