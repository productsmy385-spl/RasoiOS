"use client";

import * as React from "react";
import Image, { type ImageLoader } from "next/image";
import { ImageOff, type LucideIcon } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { imageKitSized, isImageKitUrl } from "@/lib/media/purposes";
import { cn } from "@/lib/ui/cn";
import { MENU_ICONS, isMenuIconKey } from "@/lib/ui/icons";

/**
 * Menu item / category picture (design.md §8 Images): fixed ratio, `object-cover`, the curated Lucide icon as the
 * fallback when there is no picture, and an `ImageOff` tile when the link is broken. Remote hosts come from the
 * operator allowlist that also builds `images.remotePatterns` (SC-VAL-04), so an accepted URL is always loadable.
 */
/** Uploaded images are resized by ImageKit's CDN rather than re-processed by the Next.js optimiser (ADR-017 §6). */
const imageKitLoader: ImageLoader = ({ src, width, quality }) => imageKitSized(src, width, quality ?? 80);
const loaderFor = (url: string) => (isImageKitUrl(url) ? imageKitLoader : undefined);

export function menuIcon(iconKey: string | null | undefined): LucideIcon {
  return iconKey && isMenuIconKey(iconKey) ? MENU_ICONS[iconKey] : MENU_ICONS.UtensilsCrossed;
}

export function MenuIconTile({ iconKey, size = "md", className }: { iconKey: string | null; size?: "sm" | "md" | "lg"; className?: string }) {
  return <IconTile icon={menuIcon(iconKey)} size={size} tone="warning" className={className} />;
}

export function MenuThumbnail({ imageUrl, iconKey, name }: { imageUrl: string | null; iconKey: string | null; name: string }) {
  const [broken, setBroken] = React.useState(false);
  React.useEffect(() => {
    setBroken(false);
  }, [imageUrl]);

  if (!imageUrl || broken) return <MenuIconTile iconKey={iconKey} size="md" />;
  return <Image src={imageUrl} loader={loaderFor(imageUrl)} alt={name} width={40} height={40} onError={() => setBroken(true)} className="h-10 w-10 shrink-0 rounded-xl object-cover" />;
}

/** The 4:3 picture used in the editor's public preview. */
export function MenuCover({ imageUrl, iconKey, name, className }: { imageUrl: string | null; iconKey: string | null; name: string; className?: string }) {
  const [broken, setBroken] = React.useState(false);
  React.useEffect(() => {
    setBroken(false);
  }, [imageUrl]);

  return (
    <div className={cn("relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl bg-raised", className)}>
      {imageUrl && !broken ? (
        <Image src={imageUrl} loader={loaderFor(imageUrl)} alt={name} fill sizes="(min-width: 1024px) 360px, 100vw" onError={() => setBroken(true)} className="object-cover" />
      ) : (
        <IconTile icon={imageUrl ? ImageOff : menuIcon(iconKey)} size="lg" tone={imageUrl ? "neutral" : "warning"} />
      )}
    </div>
  );
}
