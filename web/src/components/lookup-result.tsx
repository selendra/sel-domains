"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddressDisplay } from "@/components/address-display";
import { ensureSuffix } from "@/lib/utils/namehash";
import {
  Calendar,
  Copy,
  Check,
  ExternalLink,
  User,
  Link as LinkIcon,
  Mail,
  Globe,
  AtSign,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface TextRecord {
  key: string;
  value: string;
}

interface NameLookupResultProps {
  name: string;
  owner?: string;
  resolvedAddress?: string;
  textRecords?: TextRecord[];
  expires?: bigint;
  isLoading?: boolean;
  error?: string;
  isAvailable?: boolean;
}

interface AddressLookupResultProps {
  address: string;
  primaryName?: string;
  ownedDomains?: string[];
  isLoading?: boolean;
  error?: string;
}

const TEXT_RECORD_ICONS: Record<string, React.ReactNode> = {
  avatar: <User className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  url: <Globe className="h-4 w-4" />,
  description: <AtSign className="h-4 w-4" />,
  "com.twitter": <AtSign className="h-4 w-4" />,
  "com.github": <LinkIcon className="h-4 w-4" />,
  "com.discord": <AtSign className="h-4 w-4" />,
  "org.telegram": <AtSign className="h-4 w-4" />,
};

const TEXT_RECORD_LABELS: Record<string, string> = {
  avatar: "Avatar",
  email: "Email",
  url: "Website",
  description: "Description",
  "com.twitter": "Twitter",
  "com.github": "GitHub",
  "com.discord": "Discord",
  "org.telegram": "Telegram",
};

function formatExpiryDate(expires: bigint): string {
  const date = new Date(Number(expires) * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getExpiryStatus(expires: bigint): "active" | "expiring-soon" | "expired" {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const thirtyDays = BigInt(30 * 24 * 60 * 60);

  if (expires <= now) {
    return "expired";
  } else if (expires - now <= thirtyDays) {
    return "expiring-soon";
  }
  return "active";
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-[#0db0a4]"
      onClick={handleCopy}
      title={`Copy ${label}`}
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#0db0a4]" />
          <p className="text-muted-foreground">Looking up...</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Not found component for name lookup
function NameNotFound({ name }: { name: string }) {
  const displayName = ensureSuffix(name);

  return (
    <Card className="w-full max-w-2xl mx-auto border-amber-500/30">
      <CardContent className="py-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Domain Not Registered</h3>
            <p className="text-muted-foreground">
              <span className="font-mono text-[#0db0a4]">{displayName}</span> is available for registration!
            </p>
          </div>
          <Link href={`/register?name=${encodeURIComponent(name.replace('.sel', ''))}`}>
            <Button className="bg-[#0db0a4] hover:bg-[#0a9389]">
              Register {displayName}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// Error component
function LookupError({ message }: { message: string }) {
  return (
    <Card className="w-full max-w-2xl mx-auto border-red-500/30">
      <CardContent className="py-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Lookup Error</h3>
            <p className="text-muted-foreground text-sm">{message}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Name to Address lookup result
export function NameLookupResult({
  name,
  owner,
  resolvedAddress,
  textRecords = [],
  expires,
  isLoading,
  error,
  isAvailable,
}: NameLookupResultProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <LookupError message={error} />;
  }

  if (isAvailable) {
    return <NameNotFound name={name} />;
  }

  const displayName = ensureSuffix(name);
  const expiryStatus = expires ? getExpiryStatus(expires) : null;

  const filteredRecords = textRecords.filter(r => r.value && r.value.trim() !== "");

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-2xl font-bold">{displayName}</CardTitle>
            <Badge className="bg-[#0db0a4]/10 text-[#0db0a4] border-[#0db0a4]/20 hover:bg-[#0db0a4]/20">
              .sel
            </Badge>
          </div>
          {expiryStatus && (
            <Badge
              className={
                expiryStatus === "active"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : expiryStatus === "expiring-soon"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : "bg-red-500/10 text-red-600 border-red-500/20"
              }
            >
              {expiryStatus === "active" ? "Active" : expiryStatus === "expiring-soon" ? "Expiring Soon" : "Expired"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Owner */}
        {owner && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Owner</label>
            <AddressDisplay
              address={owner}
              size="md"
              showCopy
              showExplorer
            />
          </div>
        )}

        {/* Resolved Address */}
        {resolvedAddress && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Resolved Address</label>
            <div className="flex items-center gap-2">
              <AddressDisplay
                address={resolvedAddress}
                size="md"
                showCopy
                showExplorer
              />
              {resolvedAddress === owner && (
                <Badge variant="outline" className="text-xs">Primary</Badge>
              )}
            </div>
          </div>
        )}

        {/* Expiry */}
        {expires && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Expiry Date</label>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatExpiryDate(expires)}</span>
            </div>
          </div>
        )}

        {/* Text Records */}
        {filteredRecords.length > 0 && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Records</label>
            <div className="grid gap-3">
              {filteredRecords.map((record) => (
                <div
                  key={record.key}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">
                      {TEXT_RECORD_ICONS[record.key] || <LinkIcon className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {TEXT_RECORD_LABELS[record.key] || record.key}
                      </p>
                      <p className="text-sm font-medium truncate max-w-[300px]">
                        {record.value}
                      </p>
                    </div>
                  </div>
                  <CopyButton text={record.value} label={TEXT_RECORD_LABELS[record.key] || record.key} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <Link href={`/domain/${encodeURIComponent(displayName)}`}>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </Link>
          {resolvedAddress && (
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a
                href={`https://explorer.selendra.org/address/${resolvedAddress}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on Explorer
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// No reverse record component
function NoReverseRecord({ address }: { address: string }) {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="py-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <AddressDisplay
            address={address}
            size="lg"
            showCopy
            showExplorer
            truncate={false}
          />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">No Primary Name Set</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              This address doesn&apos;t have a primary .sel name associated with it.
              If you own this address, you can set a primary name in your domain settings.
            </p>
          </div>
          <Link href="/domains">
            <Button className="bg-[#0db0a4] hover:bg-[#0a9389]">
              Manage My Domains
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// Address to Name lookup result
export function AddressLookupResult({
  address,
  primaryName,
  ownedDomains = [],
  isLoading,
  error,
}: AddressLookupResultProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <LookupError message={error} />;
  }

  if (!primaryName && ownedDomains.length === 0) {
    return <NoReverseRecord address={address} />;
  }

  const displayPrimaryName = primaryName ? ensureSuffix(primaryName) : null;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-muted-foreground">
            Address Lookup
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Address with Identicon */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Address</label>
          <AddressDisplay
            address={address}
            size="lg"
            showCopy
            showExplorer
            truncate={false}
          />
        </div>

        {/* Primary Name */}
        {displayPrimaryName && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Primary Name</label>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-[#0db0a4]">{displayPrimaryName}</span>
              <Badge className="bg-[#0db0a4]/10 text-[#0db0a4] border-[#0db0a4]/20">
                Primary
              </Badge>
              <CopyButton text={displayPrimaryName} label="name" />
            </div>
          </div>
        )}

        {/* Other Owned Domains */}
        {ownedDomains.length > 0 && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              Owned Domains ({ownedDomains.length})
            </label>
            <div className="grid gap-2">
              {ownedDomains.map((domain) => {
                const displayDomain = ensureSuffix(domain);
                const isPrimary = displayPrimaryName === displayDomain;

                return (
                  <Link
                    key={domain}
                    href={`/domain/${encodeURIComponent(displayDomain)}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium group-hover:text-[#0db0a4] transition-colors">
                        {displayDomain}
                      </span>
                      {isPrimary && (
                        <Badge variant="outline" className="text-xs">Primary</Badge>
                      )}
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-[#0db0a4] transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a
              href={`https://explorer.selendra.org/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Explorer
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export { LoadingSkeleton, LookupError, NameNotFound, NoReverseRecord };
