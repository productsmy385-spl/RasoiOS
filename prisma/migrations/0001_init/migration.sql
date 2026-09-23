-- CreateEnum
CREATE TYPE "tenant_status" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "platform_role" AS ENUM ('NONE', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "tenant_role" AS ENUM ('TENANT_ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER');

-- CreateEnum
CREATE TYPE "membership_status" AS ENUM ('INVITED', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "dietary_type" AS ENUM ('VEG', 'NON_VEG', 'EGG');

-- CreateEnum
CREATE TYPE "daily_menu_status" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "order_type" AS ENUM ('DINE_IN', 'TAKEAWAY', 'DELIVERY');

-- CreateEnum
CREATE TYPE "order_channel" AS ENUM ('STAFF', 'PUBLIC_WEB');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "order_priority" AS ENUM ('NORMAL', 'HIGH');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "kot_status" AS ENUM ('QUEUED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('PAYMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('CASH', 'CARD', 'UPI');

-- CreateEnum
CREATE TYPE "transaction_status" AS ENUM ('SUCCESS', 'VOIDED');

-- CreateEnum
CREATE TYPE "printer_purpose" AS ENUM ('KOT', 'RECEIPT', 'KOT_AND_RECEIPT');

-- CreateEnum
CREATE TYPE "printer_connection" AS ENUM ('USB', 'LAN');

-- CreateEnum
CREATE TYPE "printer_health" AS ENUM ('UNKNOWN', 'ONLINE', 'OFFLINE', 'ERROR');

-- CreateEnum
CREATE TYPE "print_agent_status" AS ENUM ('PENDING_PAIRING', 'ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "print_job_type" AS ENUM ('KOT', 'RECEIPT', 'TEST');

-- CreateEnum
CREATE TYPE "print_job_status" AS ENUM ('PENDING', 'PROCESSING', 'PRINTED', 'FAILED');

-- CreateEnum
CREATE TYPE "audit_actor_type" AS ENUM ('USER', 'PRINT_AGENT', 'SYSTEM', 'PUBLIC', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "social_channel" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'WHATSAPP', 'OTHER');

-- CreateEnum
CREATE TYPE "social_card_type" AS ENUM ('DAILY_MENU', 'MENU_ITEM', 'FULL_MENU');

-- CreateEnum
CREATE TYPE "social_post_status" AS ENUM ('DRAFT', 'READY', 'MARKED_POSTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "counter_type" AS ENUM ('ORDER', 'KOT');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(48) NOT NULL,
    "status" "tenant_status" NOT NULL DEFAULT 'ACTIVE',
    "suspended_at" TIMESTAMPTZ(6),
    "suspension_reason" VARCHAR(500),
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000),
    "logo_url" VARCHAR(2048),
    "cover_image_url" VARCHAR(2048),
    "brand_accent_hex" CHAR(7),
    "phone_e164" VARCHAR(16),
    "email" VARCHAR(254),
    "address_line1" VARCHAR(160),
    "address_line2" VARCHAR(160),
    "city" VARCHAR(80),
    "region" VARCHAR(80),
    "postal_code" VARCHAR(16),
    "country_code" CHAR(2) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "show_phone" BOOLEAN NOT NULL DEFAULT true,
    "show_email" BOOLEAN NOT NULL DEFAULT true,
    "show_address" BOOLEAN NOT NULL DEFAULT true,
    "website_published" BOOLEAN NOT NULL DEFAULT false,
    "seo_title" VARCHAR(60),
    "seo_description" VARCHAR(160),
    "default_order_type" "order_type" NOT NULL DEFAULT 'DINE_IN',
    "auto_print_kot" BOOLEAN NOT NULL DEFAULT true,
    "receipt_footer" VARCHAR(280),
    "gstin" VARCHAR(15),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_hours" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "day_of_week" SMALLINT NOT NULL,
    "sequence" SMALLINT NOT NULL DEFAULT 1,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "opens_at" TIME(0),
    "closes_at" TIME(0),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurant_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kitchen_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clerk_user_id" VARCHAR(64),
    "email" VARCHAR(254) NOT NULL,
    "full_name" VARCHAR(120),
    "platform_role" "platform_role" NOT NULL DEFAULT 'NONE',
    "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
    "last_sign_in_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "tenant_role" NOT NULL,
    "status" "membership_status" NOT NULL DEFAULT 'INVITED',
    "invited_by_user_id" UUID,
    "invited_at" TIMESTAMPTZ(6),
    "accepted_at" TIMESTAMPTZ(6),
    "clerk_invitation_id" VARCHAR(64),
    "deactivated_at" TIMESTAMPTZ(6),
    "deactivated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(500),
    "icon_key" VARCHAR(40),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "kitchen_section_id" UUID,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000),
    "image_url" VARCHAR(2048),
    "icon_key" VARCHAR(40),
    "base_price" DECIMAL(12,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "dietary_type" "dietary_type",
    "prep_time_minutes" SMALLINT,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_item_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_addons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_item_addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_menus" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "business_date" DATE NOT NULL,
    "status" "daily_menu_status" NOT NULL DEFAULT 'DRAFT',
    "title" VARCHAR(80),
    "note" VARCHAR(280),
    "published_at" TIMESTAMPTZ(6),
    "published_by_user_id" UUID,
    "unpublished_at" TIMESTAMPTZ(6),
    "copied_from_daily_menu_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_menu_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "daily_menu_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "phone_e164" VARCHAR(16),
    "email" VARCHAR(254),
    "notes" VARCHAR(500),
    "created_by_user_id" UUID,
    "anonymized_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "order_number" VARCHAR(20) NOT NULL,
    "business_date" DATE NOT NULL,
    "order_type" "order_type" NOT NULL,
    "channel" "order_channel" NOT NULL DEFAULT 'STAFF',
    "status" "order_status" NOT NULL DEFAULT 'NEW',
    "priority" "order_priority" NOT NULL DEFAULT 'NORMAL',
    "payment_status" "payment_status" NOT NULL DEFAULT 'UNPAID',
    "table_label" VARCHAR(20),
    "customer_id" UUID,
    "notes" VARCHAR(500),
    "subtotal_amount" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refunded_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency_code" CHAR(3) NOT NULL,
    "idempotency_key" UUID NOT NULL,
    "created_by_user_id" UUID,
    "accepted_at" TIMESTAMPTZ(6),
    "preparing_at" TIMESTAMPTZ(6),
    "ready_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "refunded_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "cancelled_by_user_id" UUID,
    "cancel_reason" VARCHAR(280),
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "variant_id" UUID,
    "kitchen_section_id" UUID,
    "kot_round" SMALLINT NOT NULL DEFAULT 1,
    "item_name_snapshot" VARCHAR(120) NOT NULL,
    "variant_name_snapshot" VARCHAR(60),
    "unit_price_snapshot" DECIMAL(12,2) NOT NULL,
    "addons_total_snapshot" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_rate_snapshot" DECIMAL(5,2) NOT NULL,
    "quantity" SMALLINT NOT NULL,
    "line_subtotal" DECIMAL(12,2) NOT NULL,
    "line_tax" DECIMAL(12,2) NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,
    "special_instructions" VARCHAR(280),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_addons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "addon_id" UUID NOT NULL,
    "name_snapshot" VARCHAR(60) NOT NULL,
    "price_snapshot" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_item_addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kot_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "kitchen_section_id" UUID,
    "business_date" DATE NOT NULL,
    "kot_number" VARCHAR(12) NOT NULL,
    "round_number" SMALLINT NOT NULL DEFAULT 1,
    "status" "kot_status" NOT NULL DEFAULT 'QUEUED',
    "priority" "order_priority" NOT NULL DEFAULT 'NORMAL',
    "order_type_snapshot" "order_type" NOT NULL,
    "table_label_snapshot" VARCHAR(20),
    "notes_snapshot" VARCHAR(500),
    "queued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "preparing_at" TIMESTAMPTZ(6),
    "ready_at" TIMESTAMPTZ(6),
    "served_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kot_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kot_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "kot_ticket_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "quantity" SMALLINT NOT NULL,
    "item_label_snapshot" VARCHAR(190) NOT NULL,
    "addons_snapshot" VARCHAR(280),
    "instructions_snapshot" VARCHAR(280),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kot_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "type" "transaction_type" NOT NULL,
    "payment_method" "payment_method" NOT NULL,
    "status" "transaction_status" NOT NULL DEFAULT 'SUCCESS',
    "amount" DECIMAL(12,2) NOT NULL,
    "amount_tendered" DECIMAL(12,2),
    "change_due" DECIMAL(12,2),
    "reference" VARCHAR(64),
    "refund_of_transaction_id" UUID,
    "reason" VARCHAR(280),
    "business_date" DATE NOT NULL,
    "idempotency_key" UUID NOT NULL,
    "recorded_by_user_id" UUID NOT NULL,
    "voided_at" TIMESTAMPTZ(6),
    "voided_by_user_id" UUID,
    "void_reason" VARCHAR(280),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_day_closes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "business_date" DATE NOT NULL,
    "expected_cash" DECIMAL(12,2) NOT NULL,
    "counted_cash" DECIMAL(12,2) NOT NULL,
    "cash_variance" DECIMAL(12,2) NOT NULL,
    "card_total" DECIMAL(12,2) NOT NULL,
    "upi_total" DECIMAL(12,2) NOT NULL,
    "refund_total" DECIMAL(12,2) NOT NULL,
    "order_count" INTEGER NOT NULL,
    "open_order_count" INTEGER NOT NULL,
    "notes" VARCHAR(500),
    "closed_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_day_closes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "printers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "print_agent_id" UUID,
    "kitchen_section_id" UUID,
    "name" VARCHAR(60) NOT NULL,
    "purpose" "printer_purpose" NOT NULL,
    "connection_type" "printer_connection" NOT NULL,
    "connection_address" VARCHAR(255) NOT NULL,
    "paper_width_mm" SMALLINT NOT NULL DEFAULT 80,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "health" "printer_health" NOT NULL DEFAULT 'UNKNOWN',
    "health_reported_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "printers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_agents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "status" "print_agent_status" NOT NULL DEFAULT 'PENDING_PAIRING',
    "pairing_code_hash" CHAR(64),
    "pairing_expires_at" TIMESTAMPTZ(6),
    "token_hash" CHAR(64),
    "token_prefix" CHAR(8),
    "agent_version" VARCHAR(32),
    "os_info" VARCHAR(64),
    "last_seen_at" TIMESTAMPTZ(6),
    "last_seen_ip" INET,
    "created_by_user_id" UUID NOT NULL,
    "paired_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "revoked_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "print_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "printer_id" UUID NOT NULL,
    "print_agent_id" UUID,
    "job_type" "print_job_type" NOT NULL,
    "order_id" UUID,
    "kot_ticket_id" UUID,
    "dedupe_key" VARCHAR(120) NOT NULL,
    "is_reprint" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL,
    "status" "print_job_status" NOT NULL DEFAULT 'PENDING',
    "attempt_count" SMALLINT NOT NULL DEFAULT 0,
    "max_attempts" SMALLINT NOT NULL DEFAULT 3,
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claim_token" UUID,
    "claimed_at" TIMESTAMPTZ(6),
    "lease_expires_at" TIMESTAMPTZ(6),
    "printed_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "last_error_code" VARCHAR(40),
    "last_error_message" VARCHAR(500),
    "requested_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "print_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "actor_type" "audit_actor_type" NOT NULL,
    "actor_user_id" UUID,
    "actor_agent_id" UUID,
    "actor_role" VARCHAR(20),
    "action" VARCHAR(80) NOT NULL,
    "resource_type" VARCHAR(40) NOT NULL,
    "resource_id" UUID,
    "before_state" JSONB,
    "after_state" JSONB,
    "reason" VARCHAR(500),
    "request_id" VARCHAR(64),
    "ip_address" INET,
    "user_agent" VARCHAR(256),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "channel" "social_channel" NOT NULL,
    "card_type" "social_card_type" NOT NULL,
    "daily_menu_id" UUID,
    "menu_item_id" UUID,
    "caption" VARCHAR(2200) NOT NULL,
    "share_url" VARCHAR(2048) NOT NULL,
    "status" "social_post_status" NOT NULL DEFAULT 'DRAFT',
    "posted_url" VARCHAR(2048),
    "marked_posted_at" TIMESTAMPTZ(6),
    "marked_posted_by_user_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_counters" (
    "tenant_id" UUID NOT NULL,
    "counter_type" "counter_type" NOT NULL,
    "business_date" DATE NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_counters_pkey" PRIMARY KEY ("tenant_id","counter_type","business_date")
);

-- CreateTable
CREATE TABLE "rate_limit_buckets" (
    "bucket_key" VARCHAR(128) NOT NULL,
    "window_start" TIMESTAMPTZ(6) NOT NULL,
    "hit_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("bucket_key")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_tenant_id_key" ON "restaurants"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_tenant_id_id_key" ON "restaurants"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_hours_restaurant_id_day_of_week_sequence_key" ON "restaurant_hours"("restaurant_id", "day_of_week", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_hours_tenant_id_id_key" ON "restaurant_hours"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "kitchen_sections_tenant_id_sort_order_idx" ON "kitchen_sections"("tenant_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_sections_tenant_id_code_key" ON "kitchen_sections"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_sections_tenant_id_id_key" ON "kitchen_sections"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_user_id_key" ON "users"("clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_platform_role_idx" ON "users"("platform_role");

-- CreateIndex
CREATE UNIQUE INDEX "user_tenants_clerk_invitation_id_key" ON "user_tenants"("clerk_invitation_id");

-- CreateIndex
CREATE INDEX "user_tenants_user_id_status_idx" ON "user_tenants"("user_id", "status");

-- CreateIndex
CREATE INDEX "user_tenants_tenant_id_role_status_idx" ON "user_tenants"("tenant_id", "role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "user_tenants_tenant_id_user_id_key" ON "user_tenants"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_tenants_tenant_id_id_key" ON "user_tenants"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "menu_categories_tenant_id_archived_at_sort_order_idx" ON "menu_categories"("tenant_id", "archived_at", "sort_order");

-- CreateIndex
CREATE INDEX "menu_categories_tenant_id_is_published_idx" ON "menu_categories"("tenant_id", "is_published");

-- CreateIndex
CREATE UNIQUE INDEX "menu_categories_tenant_id_id_key" ON "menu_categories"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "menu_items_tenant_id_category_id_display_order_idx" ON "menu_items"("tenant_id", "category_id", "display_order");

-- CreateIndex
CREATE INDEX "menu_items_tenant_id_is_published_is_available_idx" ON "menu_items"("tenant_id", "is_published", "is_available");

-- CreateIndex
CREATE UNIQUE INDEX "menu_items_tenant_id_id_key" ON "menu_items"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "menu_item_variants_tenant_id_menu_item_id_display_order_idx" ON "menu_item_variants"("tenant_id", "menu_item_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_variants_tenant_id_id_key" ON "menu_item_variants"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "menu_item_addons_tenant_id_menu_item_id_display_order_idx" ON "menu_item_addons"("tenant_id", "menu_item_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_addons_tenant_id_id_key" ON "menu_item_addons"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "daily_menus_tenant_id_status_business_date_idx" ON "daily_menus"("tenant_id", "status", "business_date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_menus_tenant_id_business_date_key" ON "daily_menus"("tenant_id", "business_date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_menus_tenant_id_id_key" ON "daily_menus"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "daily_menu_items_tenant_id_daily_menu_id_display_order_idx" ON "daily_menu_items"("tenant_id", "daily_menu_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "daily_menu_items_daily_menu_id_menu_item_id_key" ON "daily_menu_items"("daily_menu_id", "menu_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_menu_items_tenant_id_id_key" ON "daily_menu_items"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "customers_tenant_id_full_name_idx" ON "customers"("tenant_id", "full_name");

-- CreateIndex
CREATE INDEX "customers_tenant_id_email_idx" ON "customers"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenant_id_id_key" ON "customers"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "orders_tenant_id_business_date_idx" ON "orders"("tenant_id", "business_date");

-- CreateIndex
CREATE INDEX "orders_tenant_id_status_updated_at_idx" ON "orders"("tenant_id", "status", "updated_at");

-- CreateIndex
CREATE INDEX "orders_tenant_id_payment_status_idx" ON "orders"("tenant_id", "payment_status");

-- CreateIndex
CREATE INDEX "orders_tenant_id_customer_id_created_at_idx" ON "orders"("tenant_id", "customer_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_tenant_id_updated_at_idx" ON "orders"("tenant_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_tenant_id_order_number_key" ON "orders"("tenant_id", "order_number");

-- CreateIndex
CREATE UNIQUE INDEX "orders_tenant_id_idempotency_key_key" ON "orders"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "orders_tenant_id_id_key" ON "orders"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "order_items_tenant_id_order_id_idx" ON "order_items"("tenant_id", "order_id");

-- CreateIndex
CREATE INDEX "order_items_tenant_id_menu_item_id_idx" ON "order_items"("tenant_id", "menu_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_tenant_id_id_key" ON "order_items"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "order_item_addons_tenant_id_order_item_id_idx" ON "order_item_addons"("tenant_id", "order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_item_addons_order_item_id_addon_id_key" ON "order_item_addons"("order_item_id", "addon_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_item_addons_tenant_id_id_key" ON "order_item_addons"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "kot_tickets_tenant_id_order_id_idx" ON "kot_tickets"("tenant_id", "order_id");

-- CreateIndex
CREATE INDEX "kot_tickets_tenant_id_kitchen_section_id_status_idx" ON "kot_tickets"("tenant_id", "kitchen_section_id", "status");

-- CreateIndex
CREATE INDEX "kot_tickets_tenant_id_status_updated_at_idx" ON "kot_tickets"("tenant_id", "status", "updated_at");

-- CreateIndex
CREATE INDEX "kot_tickets_tenant_id_updated_at_idx" ON "kot_tickets"("tenant_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "kot_tickets_order_section_round_key" ON "kot_tickets"("tenant_id", "order_id", "kitchen_section_id", "round_number");

-- CreateIndex
CREATE UNIQUE INDEX "kot_tickets_tenant_id_business_date_kot_number_key" ON "kot_tickets"("tenant_id", "business_date", "kot_number");

-- CreateIndex
CREATE UNIQUE INDEX "kot_tickets_tenant_id_id_key" ON "kot_tickets"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "kot_items_tenant_id_kot_ticket_id_idx" ON "kot_items"("tenant_id", "kot_ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "kot_items_kot_ticket_id_order_item_id_key" ON "kot_items"("kot_ticket_id", "order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "kot_items_tenant_id_id_key" ON "kot_items"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "transactions_tenant_id_order_id_idx" ON "transactions"("tenant_id", "order_id");

-- CreateIndex
CREATE INDEX "transactions_tenant_id_business_date_type_idx" ON "transactions"("tenant_id", "business_date", "type");

-- CreateIndex
CREATE INDEX "transactions_tenant_id_recorded_by_user_id_created_at_idx" ON "transactions"("tenant_id", "recorded_by_user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_tenant_id_idempotency_key_key" ON "transactions"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_tenant_id_id_key" ON "transactions"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "business_day_closes_tenant_id_business_date_key" ON "business_day_closes"("tenant_id", "business_date");

-- CreateIndex
CREATE UNIQUE INDEX "business_day_closes_tenant_id_id_key" ON "business_day_closes"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "printers_tenant_id_print_agent_id_idx" ON "printers"("tenant_id", "print_agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "printers_tenant_id_id_key" ON "printers"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "print_agents_pairing_code_hash_key" ON "print_agents"("pairing_code_hash");

-- CreateIndex
CREATE UNIQUE INDEX "print_agents_token_hash_key" ON "print_agents"("token_hash");

-- CreateIndex
CREATE INDEX "print_agents_tenant_id_status_idx" ON "print_agents"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "print_agents_tenant_id_id_key" ON "print_agents"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "print_jobs_tenant_id_printer_id_status_next_attempt_at_idx" ON "print_jobs"("tenant_id", "printer_id", "status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "print_jobs_tenant_id_order_id_idx" ON "print_jobs"("tenant_id", "order_id");

-- CreateIndex
CREATE INDEX "print_jobs_tenant_id_kot_ticket_id_idx" ON "print_jobs"("tenant_id", "kot_ticket_id");

-- CreateIndex
CREATE INDEX "print_jobs_tenant_id_updated_at_idx" ON "print_jobs"("tenant_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "print_jobs_tenant_id_dedupe_key_key" ON "print_jobs"("tenant_id", "dedupe_key");

-- CreateIndex
CREATE UNIQUE INDEX "print_jobs_tenant_id_id_key" ON "print_jobs"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "audit_logs"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_action_created_at_idx" ON "audit_logs"("tenant_id", "action", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_resource_type_resource_id_idx" ON "audit_logs"("tenant_id", "resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "social_posts_tenant_id_status_created_at_idx" ON "social_posts"("tenant_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "social_posts_tenant_id_id_key" ON "social_posts"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "rate_limit_buckets_expires_at_idx" ON "rate_limit_buckets"("expires_at");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_hours" ADD CONSTRAINT "restaurant_hours_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_hours" ADD CONSTRAINT "restaurant_hours_tenant_id_restaurant_id_fkey" FOREIGN KEY ("tenant_id", "restaurant_id") REFERENCES "restaurants"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_sections" ADD CONSTRAINT "kitchen_sections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tenants" ADD CONSTRAINT "user_tenants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tenants" ADD CONSTRAINT "user_tenants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tenants" ADD CONSTRAINT "user_tenants_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tenants" ADD CONSTRAINT "user_tenants_deactivated_by_user_id_fkey" FOREIGN KEY ("deactivated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_tenant_id_category_id_fkey" FOREIGN KEY ("tenant_id", "category_id") REFERENCES "menu_categories"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_tenant_id_kitchen_section_id_fkey" FOREIGN KEY ("tenant_id", "kitchen_section_id") REFERENCES "kitchen_sections"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_variants" ADD CONSTRAINT "menu_item_variants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_variants" ADD CONSTRAINT "menu_item_variants_tenant_id_menu_item_id_fkey" FOREIGN KEY ("tenant_id", "menu_item_id") REFERENCES "menu_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_addons" ADD CONSTRAINT "menu_item_addons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_addons" ADD CONSTRAINT "menu_item_addons_tenant_id_menu_item_id_fkey" FOREIGN KEY ("tenant_id", "menu_item_id") REFERENCES "menu_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_menus" ADD CONSTRAINT "daily_menus_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_menus" ADD CONSTRAINT "daily_menus_published_by_user_id_fkey" FOREIGN KEY ("published_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_menus" ADD CONSTRAINT "daily_menus_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_menus" ADD CONSTRAINT "daily_menus_tenant_id_copied_from_daily_menu_id_fkey" FOREIGN KEY ("tenant_id", "copied_from_daily_menu_id") REFERENCES "daily_menus"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_menu_items" ADD CONSTRAINT "daily_menu_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_menu_items" ADD CONSTRAINT "daily_menu_items_tenant_id_daily_menu_id_fkey" FOREIGN KEY ("tenant_id", "daily_menu_id") REFERENCES "daily_menus"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_menu_items" ADD CONSTRAINT "daily_menu_items_tenant_id_menu_item_id_fkey" FOREIGN KEY ("tenant_id", "menu_item_id") REFERENCES "menu_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_customer_id_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_cancelled_by_user_id_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_tenant_id_order_id_fkey" FOREIGN KEY ("tenant_id", "order_id") REFERENCES "orders"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_tenant_id_menu_item_id_fkey" FOREIGN KEY ("tenant_id", "menu_item_id") REFERENCES "menu_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_tenant_id_variant_id_fkey" FOREIGN KEY ("tenant_id", "variant_id") REFERENCES "menu_item_variants"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_tenant_id_kitchen_section_id_fkey" FOREIGN KEY ("tenant_id", "kitchen_section_id") REFERENCES "kitchen_sections"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_addons" ADD CONSTRAINT "order_item_addons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_addons" ADD CONSTRAINT "order_item_addons_tenant_id_order_item_id_fkey" FOREIGN KEY ("tenant_id", "order_item_id") REFERENCES "order_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_addons" ADD CONSTRAINT "order_item_addons_tenant_id_addon_id_fkey" FOREIGN KEY ("tenant_id", "addon_id") REFERENCES "menu_item_addons"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kot_tickets" ADD CONSTRAINT "kot_tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kot_tickets" ADD CONSTRAINT "kot_tickets_tenant_id_order_id_fkey" FOREIGN KEY ("tenant_id", "order_id") REFERENCES "orders"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kot_tickets" ADD CONSTRAINT "kot_tickets_tenant_id_kitchen_section_id_fkey" FOREIGN KEY ("tenant_id", "kitchen_section_id") REFERENCES "kitchen_sections"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kot_items" ADD CONSTRAINT "kot_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kot_items" ADD CONSTRAINT "kot_items_tenant_id_kot_ticket_id_fkey" FOREIGN KEY ("tenant_id", "kot_ticket_id") REFERENCES "kot_tickets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kot_items" ADD CONSTRAINT "kot_items_tenant_id_order_item_id_fkey" FOREIGN KEY ("tenant_id", "order_item_id") REFERENCES "order_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenant_id_order_id_fkey" FOREIGN KEY ("tenant_id", "order_id") REFERENCES "orders"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenant_id_refund_of_transaction_id_fkey" FOREIGN KEY ("tenant_id", "refund_of_transaction_id") REFERENCES "transactions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_voided_by_user_id_fkey" FOREIGN KEY ("voided_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_day_closes" ADD CONSTRAINT "business_day_closes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_day_closes" ADD CONSTRAINT "business_day_closes_closed_by_user_id_fkey" FOREIGN KEY ("closed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "printers" ADD CONSTRAINT "printers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "printers" ADD CONSTRAINT "printers_tenant_id_print_agent_id_fkey" FOREIGN KEY ("tenant_id", "print_agent_id") REFERENCES "print_agents"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "printers" ADD CONSTRAINT "printers_tenant_id_kitchen_section_id_fkey" FOREIGN KEY ("tenant_id", "kitchen_section_id") REFERENCES "kitchen_sections"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_agents" ADD CONSTRAINT "print_agents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_agents" ADD CONSTRAINT "print_agents_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_agents" ADD CONSTRAINT "print_agents_revoked_by_user_id_fkey" FOREIGN KEY ("revoked_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_tenant_id_printer_id_fkey" FOREIGN KEY ("tenant_id", "printer_id") REFERENCES "printers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_tenant_id_print_agent_id_fkey" FOREIGN KEY ("tenant_id", "print_agent_id") REFERENCES "print_agents"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_tenant_id_order_id_fkey" FOREIGN KEY ("tenant_id", "order_id") REFERENCES "orders"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_tenant_id_kot_ticket_id_fkey" FOREIGN KEY ("tenant_id", "kot_ticket_id") REFERENCES "kot_tickets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_tenant_id_daily_menu_id_fkey" FOREIGN KEY ("tenant_id", "daily_menu_id") REFERENCES "daily_menus"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_tenant_id_menu_item_id_fkey" FOREIGN KEY ("tenant_id", "menu_item_id") REFERENCES "menu_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_marked_posted_by_user_id_fkey" FOREIGN KEY ("marked_posted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_counters" ADD CONSTRAINT "tenant_counters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================================================================
-- Hand-written section (S1-P02-T003). Invariants Prisma's schema language cannot express.
-- Source: knowledge/implementation/slice-01/data-model.md (E03–E27, §3 INV-01…INV-10), ADR-008, ADR-010.
-- No existing data is preserved (Q-017 answered A, 2026-09-15): this migration starts from an empty database.
-- =====================================================================================================

-- ---------- Partial and expression unique indexes ----------

-- E07: category names unique per tenant, case-insensitive, among non-archived rows
CREATE UNIQUE INDEX "menu_categories_tenant_id_lower_name_active_key"
  ON "menu_categories" ("tenant_id", lower("name")) WHERE "archived_at" IS NULL;

-- E09: variant names unique per item among non-archived rows; at most one default variant per item
CREATE UNIQUE INDEX "menu_item_variants_menu_item_id_lower_name_active_key"
  ON "menu_item_variants" ("menu_item_id", lower("name")) WHERE "archived_at" IS NULL;
CREATE UNIQUE INDEX "menu_item_variants_menu_item_id_default_key"
  ON "menu_item_variants" ("menu_item_id") WHERE "is_default" AND "archived_at" IS NULL;

-- E10: add-on names unique per item among non-archived rows
CREATE UNIQUE INDEX "menu_item_addons_menu_item_id_lower_name_active_key"
  ON "menu_item_addons" ("menu_item_id", lower("name")) WHERE "archived_at" IS NULL;

-- E13: a phone number identifies at most one customer per tenant
CREATE UNIQUE INDEX "customers_tenant_id_phone_e164_key"
  ON "customers" ("tenant_id", "phone_e164") WHERE "phone_e164" IS NOT NULL;

-- E21 / E22: printer and agent names unique per tenant, case-insensitive
CREATE UNIQUE INDEX "printers_tenant_id_lower_name_key" ON "printers" ("tenant_id", lower("name"));
CREATE UNIQUE INDEX "print_agents_tenant_id_lower_name_key" ON "print_agents" ("tenant_id", lower("name"));

-- E17 U-KOT-2: one KOT per order, section (NULL = unsectioned) and round; makes KOT generation idempotent (BA-18).
-- Prisma creates this index without NULLS NOT DISTINCT (it cannot express it); recreate it under the same name.
DROP INDEX "kot_tickets_order_section_round_key";
CREATE UNIQUE INDEX "kot_tickets_order_section_round_key"
  ON "kot_tickets" ("tenant_id", "order_id", "kitchen_section_id", "round_number") NULLS NOT DISTINCT;

-- ---------- CHECK constraints ----------

-- E03 RESTAURANT_HOURS
ALTER TABLE "restaurant_hours"
  ADD CONSTRAINT "restaurant_hours_day_of_week_check" CHECK ("day_of_week" BETWEEN 1 AND 7),
  ADD CONSTRAINT "restaurant_hours_sequence_check" CHECK ("sequence" BETWEEN 1 AND 3),
  ADD CONSTRAINT "restaurant_hours_times_check" CHECK (
    ("is_closed" AND "opens_at" IS NULL AND "closes_at" IS NULL)
    OR (NOT "is_closed" AND "opens_at" IS NOT NULL AND "closes_at" IS NOT NULL AND "opens_at" <> "closes_at")
  );

-- E04 KITCHEN_SECTION
ALTER TABLE "kitchen_sections"
  ADD CONSTRAINT "kitchen_sections_sort_order_check" CHECK ("sort_order" BETWEEN 0 AND 9999);

-- E07 MENU_CATEGORY
ALTER TABLE "menu_categories"
  ADD CONSTRAINT "menu_categories_sort_order_check" CHECK ("sort_order" BETWEEN 0 AND 9999);

-- E08 MENU_ITEM
ALTER TABLE "menu_items"
  ADD CONSTRAINT "menu_items_base_price_check" CHECK ("base_price" >= 0),
  ADD CONSTRAINT "menu_items_tax_rate_check" CHECK ("tax_rate" BETWEEN 0 AND 100),
  ADD CONSTRAINT "menu_items_prep_time_minutes_check" CHECK ("prep_time_minutes" IS NULL OR "prep_time_minutes" BETWEEN 0 AND 240),
  ADD CONSTRAINT "menu_items_display_order_check" CHECK ("display_order" BETWEEN 0 AND 9999);

-- E09 / E10 variants and add-ons
ALTER TABLE "menu_item_variants"
  ADD CONSTRAINT "menu_item_variants_price_check" CHECK ("price" >= 0),
  ADD CONSTRAINT "menu_item_variants_display_order_check" CHECK ("display_order" BETWEEN 0 AND 999);
ALTER TABLE "menu_item_addons"
  ADD CONSTRAINT "menu_item_addons_price_check" CHECK ("price" >= 0),
  ADD CONSTRAINT "menu_item_addons_display_order_check" CHECK ("display_order" BETWEEN 0 AND 999);

-- E14 ORDER (INV-02, INV-04; discount is always zero until Q-006 approves a discount feature)
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_subtotal_amount_check" CHECK ("subtotal_amount" >= 0),
  ADD CONSTRAINT "orders_tax_amount_check" CHECK ("tax_amount" >= 0),
  ADD CONSTRAINT "orders_discount_amount_check" CHECK ("discount_amount" = 0),
  ADD CONSTRAINT "orders_total_amount_check" CHECK ("total_amount" = "subtotal_amount" + "tax_amount" - "discount_amount"),
  ADD CONSTRAINT "orders_paid_amount_check" CHECK ("paid_amount" >= 0),
  ADD CONSTRAINT "orders_refunded_amount_check" CHECK ("refunded_amount" >= 0 AND "refunded_amount" <= "paid_amount"),
  ADD CONSTRAINT "orders_version_check" CHECK ("version" >= 0),
  ADD CONSTRAINT "orders_currency_code_check" CHECK ("currency_code" ~ '^[A-Z]{3}$');

-- E15 ORDER_ITEM (INV-02)
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_quantity_check" CHECK ("quantity" BETWEEN 1 AND 99),
  ADD CONSTRAINT "order_items_kot_round_check" CHECK ("kot_round" >= 1),
  ADD CONSTRAINT "order_items_unit_price_snapshot_check" CHECK ("unit_price_snapshot" >= 0),
  ADD CONSTRAINT "order_items_addons_total_snapshot_check" CHECK ("addons_total_snapshot" >= 0),
  ADD CONSTRAINT "order_items_tax_rate_snapshot_check" CHECK ("tax_rate_snapshot" BETWEEN 0 AND 100),
  ADD CONSTRAINT "order_items_line_subtotal_check" CHECK ("line_subtotal" >= 0),
  ADD CONSTRAINT "order_items_line_tax_check" CHECK ("line_tax" >= 0),
  ADD CONSTRAINT "order_items_line_total_check" CHECK ("line_total" = "line_subtotal" + "line_tax"),
  ADD CONSTRAINT "order_items_line_subtotal_formula_check" CHECK (
    "line_subtotal" = ("unit_price_snapshot" + "addons_total_snapshot") * "quantity"
  );

-- E16 ORDER_ITEM_ADDON
ALTER TABLE "order_item_addons"
  ADD CONSTRAINT "order_item_addons_price_snapshot_check" CHECK ("price_snapshot" >= 0);

-- E17 / E18 KOT
ALTER TABLE "kot_tickets"
  ADD CONSTRAINT "kot_tickets_round_number_check" CHECK ("round_number" >= 1);
ALTER TABLE "kot_items"
  ADD CONSTRAINT "kot_items_quantity_check" CHECK ("quantity" BETWEEN 1 AND 99);

-- E19 TRANSACTION (ledger rows; cash tendered applies to CASH only; refunds reference a payment and carry a reason)
ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_amount_check" CHECK ("amount" > 0),
  ADD CONSTRAINT "transactions_amount_tendered_check" CHECK (
    "amount_tendered" IS NULL OR ("payment_method" = 'CASH' AND "amount_tendered" >= "amount")
  ),
  ADD CONSTRAINT "transactions_change_due_check" CHECK ("change_due" IS NULL OR "change_due" >= 0),
  ADD CONSTRAINT "transactions_refund_reference_check" CHECK (
    ("type" = 'PAYMENT' AND "refund_of_transaction_id" IS NULL)
    OR ("type" = 'REFUND' AND "refund_of_transaction_id" IS NOT NULL AND "reason" IS NOT NULL)
  ),
  ADD CONSTRAINT "transactions_void_check" CHECK (
    ("status" = 'SUCCESS' AND "voided_at" IS NULL)
    OR ("status" = 'VOIDED' AND "voided_at" IS NOT NULL AND "void_reason" IS NOT NULL)
  );

-- E20 BUSINESS_DAY_CLOSE (expected cash and net card/UPI totals can be negative after cross-day refunds)
ALTER TABLE "business_day_closes"
  ADD CONSTRAINT "business_day_closes_counted_cash_check" CHECK ("counted_cash" >= 0),
  ADD CONSTRAINT "business_day_closes_cash_variance_check" CHECK ("cash_variance" = "counted_cash" - "expected_cash"),
  ADD CONSTRAINT "business_day_closes_refund_total_check" CHECK ("refund_total" >= 0),
  ADD CONSTRAINT "business_day_closes_counts_check" CHECK ("order_count" >= 0 AND "open_order_count" >= 0);

-- E21 PRINTER
ALTER TABLE "printers"
  ADD CONSTRAINT "printers_paper_width_mm_check" CHECK ("paper_width_mm" IN (58, 80));

-- E23 PRINT_JOB (INV-06: PRINTED implies an agent-confirmed print time)
ALTER TABLE "print_jobs"
  ADD CONSTRAINT "print_jobs_printed_at_check" CHECK ("status" <> 'PRINTED' OR "printed_at" IS NOT NULL),
  ADD CONSTRAINT "print_jobs_attempt_count_check" CHECK ("attempt_count" >= 0),
  ADD CONSTRAINT "print_jobs_max_attempts_check" CHECK ("max_attempts" BETWEEN 1 AND 10),
  ADD CONSTRAINT "print_jobs_kot_ticket_check" CHECK ("job_type" <> 'KOT' OR "kot_ticket_id" IS NOT NULL);

-- E26 TENANT_COUNTER
ALTER TABLE "tenant_counters"
  ADD CONSTRAINT "tenant_counters_last_value_check" CHECK ("last_value" >= 0);

-- E27 RATE_LIMIT_BUCKET
ALTER TABLE "rate_limit_buckets"
  ADD CONSTRAINT "rate_limit_buckets_hit_count_check" CHECK ("hit_count" >= 0);

-- ---------- E24 AUDIT_LOG immutability (INV-08, SC-AUD-03) ----------

CREATE FUNCTION "audit_logs_immutable"() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: % is not allowed', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER "audit_logs_no_update_delete"
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION "audit_logs_immutable"();

-- TRUNCATE bypasses row triggers, so it gets its own statement-level guard (INV-08).
CREATE TRIGGER "audit_logs_no_truncate"
  BEFORE TRUNCATE ON "audit_logs"
  FOR EACH STATEMENT EXECUTE FUNCTION "audit_logs_immutable"();
