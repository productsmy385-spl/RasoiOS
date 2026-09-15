"use client";

import { TenantStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Shield, Calendar, ExternalLink } from "lucide-react";

export interface TenantData {
  id: string;
  name: string;
  slug: string;
  createdAt: string | Date;
  status: TenantStatus;
  userCount?: number;
  orderCount?: number;
}

interface TenantListProps {
  tenants: TenantData[];
  onManageTenant?: (slug: string) => void;
}

export function TenantList({ tenants, onManageTenant }: TenantListProps) {
  return (
    <div className="space-y-4">
      {tenants.map((tenant) => (
        <Card
          key={tenant.id}
          className="glass-panel flex flex-col md:flex-row md:items-center justify-between gap-4 p-5"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#D97706]/15 border border-[#D97706]/30 flex items-center justify-center text-[#D97706] shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-display font-bold text-lg text-[#FBF9F5]">
                  {tenant.name}
                </h3>
                <Badge variant={tenant.status === "ACTIVE" ? "success" : "destructive"}>
                  {tenant.status === "ACTIVE" ? "Active License" : "Suspended"}
                </Badge>
              </div>
              <p className="text-xs font-mono text-gray-400 mt-0.5">
                slug: <span className="text-amber-400">/r/{tenant.slug}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-gray-400">
            <div className="flex items-center gap-1.5 font-mono">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <span>
                Registered: {new Date(tenant.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-mono">
              <Shield className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Strict DB Isolation</span>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onManageTenant?.(tenant.slug)}
            >
              Open Console <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
