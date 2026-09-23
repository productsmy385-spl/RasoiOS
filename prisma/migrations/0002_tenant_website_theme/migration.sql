-- S1-P07/S1-P09 (RASOIOS-ADR-013 §6): per-tenant website theme, identity and configurable sections.
-- Additive only: every new column is nullable or carries a default, so the migration is safe to re-run forward.

-- ───────────────────────── enums ─────────────────────────

CREATE TYPE "website_theme_preset" AS ENUM ('PLATFORM', 'CITRUS', 'OCEAN', 'BERRY', 'CUSTOM');
CREATE TYPE "website_surface_mode" AS ENUM ('DARK', 'LIGHT');
CREATE TYPE "website_section_key" AS ENUM ('HERO', 'ABOUT', 'FEATURED_MENU', 'CATEGORIES', 'POPULAR_ITEMS', 'INFO', 'HOURS', 'GALLERY', 'LOCATION', 'CONTACT', 'CTA');

-- ───────────────────────── RESTAURANT: theme, identity, social ─────────────────────────

ALTER TABLE "restaurants"
  ADD COLUMN "tagline" VARCHAR(160),
  ADD COLUMN "hero_image_url" VARCHAR(2048),
  ADD COLUMN "favicon_url" VARCHAR(2048),
  ADD COLUMN "theme_preset" "website_theme_preset" NOT NULL DEFAULT 'PLATFORM',
  ADD COLUMN "theme_surface_mode" "website_surface_mode" NOT NULL DEFAULT 'DARK',
  ADD COLUMN "theme_primary_hex" CHAR(7),
  ADD COLUMN "theme_secondary_hex" CHAR(7),
  ADD COLUMN "gradient_from_hex" CHAR(7),
  ADD COLUMN "gradient_to_hex" CHAR(7),
  ADD COLUMN "instagram_url" VARCHAR(2048),
  ADD COLUMN "facebook_url" VARCHAR(2048),
  ADD COLUMN "whatsapp_e164" VARCHAR(16),
  ADD COLUMN "maps_url" VARCHAR(2048);

-- Colours are uppercase #RRGGBB; `brand_accent_hex` is the theme accent (ADR-013 §6).
ALTER TABLE "restaurants"
  ADD CONSTRAINT "restaurants_brand_accent_hex_check" CHECK ("brand_accent_hex" IS NULL OR "brand_accent_hex" ~ '^#[0-9A-F]{6}$'),
  ADD CONSTRAINT "restaurants_theme_primary_hex_check" CHECK ("theme_primary_hex" IS NULL OR "theme_primary_hex" ~ '^#[0-9A-F]{6}$'),
  ADD CONSTRAINT "restaurants_theme_secondary_hex_check" CHECK ("theme_secondary_hex" IS NULL OR "theme_secondary_hex" ~ '^#[0-9A-F]{6}$'),
  ADD CONSTRAINT "restaurants_gradient_from_hex_check" CHECK ("gradient_from_hex" IS NULL OR "gradient_from_hex" ~ '^#[0-9A-F]{6}$'),
  ADD CONSTRAINT "restaurants_gradient_to_hex_check" CHECK ("gradient_to_hex" IS NULL OR "gradient_to_hex" ~ '^#[0-9A-F]{6}$'),
  -- A CUSTOM theme must carry its three colours; a preset theme must not (the preset defines them).
  ADD CONSTRAINT "restaurants_theme_custom_colours_check" CHECK (
    ("theme_preset" <> 'CUSTOM')
    OR ("theme_primary_hex" IS NOT NULL AND "theme_secondary_hex" IS NOT NULL AND "brand_accent_hex" IS NOT NULL)
  ),
  ADD CONSTRAINT "restaurants_whatsapp_e164_check" CHECK ("whatsapp_e164" IS NULL OR "whatsapp_e164" ~ '^\+[1-9][0-9]{7,14}$'),
  -- Website URLs are https only (Q-009 A: allow-listed HTTPS links, no uploads).
  ADD CONSTRAINT "restaurants_hero_image_url_https_check" CHECK ("hero_image_url" IS NULL OR "hero_image_url" LIKE 'https://%'),
  ADD CONSTRAINT "restaurants_favicon_url_https_check" CHECK ("favicon_url" IS NULL OR "favicon_url" LIKE 'https://%'),
  ADD CONSTRAINT "restaurants_instagram_url_https_check" CHECK ("instagram_url" IS NULL OR "instagram_url" LIKE 'https://%'),
  ADD CONSTRAINT "restaurants_facebook_url_https_check" CHECK ("facebook_url" IS NULL OR "facebook_url" LIKE 'https://%'),
  ADD CONSTRAINT "restaurants_maps_url_https_check" CHECK ("maps_url" IS NULL OR "maps_url" LIKE 'https://%');

-- ───────────────────────── WEBSITE_SECTION ─────────────────────────

CREATE TABLE "website_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "key" "website_section_key" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "headline" VARCHAR(120),
    "body" VARCHAR(1000),
    "image_url" VARCHAR(2048),
    "cta_label" VARCHAR(40),
    "cta_href" VARCHAR(2048),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_sections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "website_sections_tenant_id_id_key" ON "website_sections"("tenant_id", "id");
CREATE UNIQUE INDEX "website_sections_tenant_id_restaurant_id_key_key" ON "website_sections"("tenant_id", "restaurant_id", "key");
CREATE INDEX "website_sections_tenant_id_restaurant_id_sort_order_idx" ON "website_sections"("tenant_id", "restaurant_id", "sort_order");

ALTER TABLE "website_sections"
  ADD CONSTRAINT "website_sections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  -- Composite parent key: a section can only belong to its own tenant's restaurant (SC-TEN-02).
  ADD CONSTRAINT "website_sections_tenant_id_restaurant_id_fkey" FOREIGN KEY ("tenant_id", "restaurant_id") REFERENCES "restaurants"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "website_sections"
  ADD CONSTRAINT "website_sections_sort_order_check" CHECK ("sort_order" BETWEEN 0 AND 999),
  ADD CONSTRAINT "website_sections_image_url_https_check" CHECK ("image_url" IS NULL OR "image_url" LIKE 'https://%'),
  -- A call to action is either an internal path or an https link.
  ADD CONSTRAINT "website_sections_cta_href_check" CHECK ("cta_href" IS NULL OR "cta_href" LIKE 'https://%' OR "cta_href" LIKE '/%'),
  ADD CONSTRAINT "website_sections_cta_pair_check" CHECK (("cta_label" IS NULL) = ("cta_href" IS NULL));
