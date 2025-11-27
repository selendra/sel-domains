"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, Clock, ExternalLink } from "lucide-react";
import { ensureSuffix } from "@/lib/utils/namehash";

interface DomainCardProps {
  name: string;
  expires: bigint;
  onClick?: () => void;
}

type DomainStatus = "active" | "expiring-soon" | "expired";

function getDomainStatus(expires: bigint): DomainStatus {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const thirtyDays = BigInt(30 * 24 * 60 * 60);

  if (expires <= now) {
    return "expired";
  } else if (expires - now <= thirtyDays) {
    return "expiring-soon";
  }
  return "active";
}

function getStatusBadge(status: DomainStatus) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">
          Active
        </Badge>
      );
    case "expiring-soon":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20">
          Expiring Soon
        </Badge>
      );
    case "expired":
      return (
        <Badge className="bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20">
          Expired
        </Badge>
      );
  }
}

function formatExpiryDate(expires: bigint): string {
  const date = new Date(Number(expires) * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getTimeUntilExpiry(expires: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = Number(expires) - now;

  if (diff <= 0) {
    return "Expired";
  }

  const days = Math.floor(diff / (24 * 60 * 60));
  if (days > 365) {
    const years = Math.floor(days / 365);
    return `${years} year${years > 1 ? "s" : ""} left`;
  } else if (days > 30) {
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? "s" : ""} left`;
  } else if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} left`;
  } else {
    const hours = Math.floor(diff / (60 * 60));
    return `${hours} hour${hours > 1 ? "s" : ""} left`;
  }
}

export function DomainCard({ name, expires, onClick }: DomainCardProps) {
  const displayName = ensureSuffix(name);
  const status = getDomainStatus(expires);
  const statusBadge = getStatusBadge(status);

  return (
    <Link href={`/domain/${encodeURIComponent(displayName)}`}>
      <Card
        className="group cursor-pointer transition-all duration-200 hover:border-[#0db0a4]/50 hover:shadow-md hover:shadow-[#0db0a4]/5"
        onClick={onClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg font-semibold text-foreground group-hover:text-[#0db0a4] transition-colors">
              {displayName}
            </CardTitle>
            {statusBadge}
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Expires: {formatExpiryDate(expires)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{getTimeUntilExpiry(expires)}</span>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-[#0db0a4] opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Manage domain</span>
            <ExternalLink className="h-3 w-3 ml-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export { getDomainStatus, getStatusBadge, formatExpiryDate, getTimeUntilExpiry };
export type { DomainStatus };
