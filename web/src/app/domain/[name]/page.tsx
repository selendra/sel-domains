"use client";

import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { useConnect } from "wagmi";
import Link from "next/link";
import { Header } from "@/components/header";
import { RecordEditor } from "@/components/record-editor";
import { TransferDomain } from "@/components/transfer-domain";
import { RenewDomain } from "@/components/renew-domain";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  useGetOwner,
  useGetResolver,
  useResolve,
} from "@/hooks/use-sns";
import { useGetDomainExpiry } from "@/hooks/use-domain-management";
import {
  getDomainStatus,
  getStatusBadge,
  formatExpiryDate,
  getTimeUntilExpiry,
} from "@/components/domain-card";
import { ensureSuffix } from "@/lib/utils/namehash";
import {
  Loader2,
  ArrowLeft,
  Globe,
  User,
  Settings,
  Calendar,
  Clock,
  Shield,
  Copy,
  Check,
  ExternalLink,
  Wallet,
} from "lucide-react";
import { useState } from "react";

function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-muted transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
    </button>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-[#0db0a4]" />
      <p className="text-muted-foreground">Loading domain details...</p>
    </div>
  );
}

function NotFoundState({ name }: { name: string }) {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Globe className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle>Domain Not Found</CardTitle>
        <CardDescription>
          The domain <span className="font-mono">{name}</span> is not registered or doesn&apos;t exist.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Link href={`/register?name=${encodeURIComponent(name.replace('.sel', ''))}`}>
          <Button className="w-full bg-[#0db0a4] hover:bg-[#0a9389]">
            Register This Domain
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function ConnectWalletBanner() {
  const { connectors, connect } = useConnect();

  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-amber-500" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">
                Wallet Not Connected
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-500">
                Connect your wallet to manage this domain.
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              const connector = connectors[0];
              if (connector) {
                connect({ connector });
              }
            }}
            className="bg-[#0db0a4] hover:bg-[#0a9389]"
            size="sm"
          >
            Connect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface DomainDetailsProps {
  name: string;
}

function DomainDetails({ name }: DomainDetailsProps) {
  const { address: connectedAddress, isConnected } = useAccount();

  const { owner, isLoading: isOwnerLoading } = useGetOwner(name);
  const { resolver, isLoading: isResolverLoading } = useGetResolver(name);
  const { address: resolvedAddress, isLoading: isResolvedLoading } = useResolve(name);
  const { expires, isLoading: isExpiryLoading } = useGetDomainExpiry(name);

  const isLoading = isOwnerLoading || isResolverLoading || isExpiryLoading;

  if (isLoading) {
    return <LoadingState />;
  }

  // Check if domain exists (owner is not zero address)
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  if (!owner || owner === zeroAddress) {
    return <NotFoundState name={name} />;
  }

  const isOwner = isConnected && connectedAddress?.toLowerCase() === owner?.toLowerCase();
  const status = expires ? getDomainStatus(expires) : "active";
  const statusBadge = getStatusBadge(status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-[#0db0a4]">{name}</h1>
            {statusBadge}
          </div>
          {isOwner && (
            <Badge variant="secondary" className="gap-1">
              <User className="h-3 w-3" />
              You own this domain
            </Badge>
          )}
        </div>
        <Link href="/my-domains">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            My Domains
          </Button>
        </Link>
      </div>

      {/* Connect Wallet Banner for non-connected users */}
      {!isConnected && <ConnectWalletBanner />}

      {/* Domain Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-[#0db0a4]" />
            Domain Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Owner */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              Owner
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{shortenAddress(owner)}</span>
              <CopyButton text={owner} />
              <a
                href={`https://portal.selendra.org/?rpc=wss%3A%2F%2Frpc-testnet.selendra.org#/explorer`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </a>
            </div>
          </div>

          <Separator />

          {/* Resolver */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Settings className="h-4 w-4" />
              Resolver
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">
                {resolver && resolver !== zeroAddress
                  ? shortenAddress(resolver)
                  : "Not set"}
              </span>
              {resolver && resolver !== zeroAddress && (
                <>
                  <CopyButton text={resolver} />
                  <a
                    href={`https://portal.selendra.org/?rpc=wss%3A%2F%2Frpc-testnet.selendra.org#/explorer`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Resolved Address */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              Resolves To
            </div>
            <div className="flex items-center gap-2">
              {isResolvedLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : resolvedAddress && resolvedAddress !== zeroAddress ? (
                <>
                  <span className="font-mono text-sm">
                    {shortenAddress(resolvedAddress)}
                  </span>
                  <CopyButton text={resolvedAddress} />
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Not set</span>
              )}
            </div>
          </div>

          <Separator />

          {/* Expiry */}
          {expires && (
            <>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Expiry Date
                </div>
                <span className="font-medium">{formatExpiryDate(expires)}</span>
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Time Remaining
                </div>
                <span className={`font-medium ${status === "expired"
                    ? "text-red-500"
                    : status === "expiring-soon"
                      ? "text-amber-500"
                      : "text-emerald-500"
                  }`}>
                  {getTimeUntilExpiry(expires)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Records Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5 text-[#0db0a4]" />
          Records
        </h2>
        <RecordEditor name={name} isOwner={isOwner} />
      </div>

      {/* Owner Actions */}
      {isOwner && expires && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#0db0a4]" />
            Domain Management
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <RenewDomain name={name} currentExpiry={expires} />
            <TransferDomain name={name} currentOwner={owner} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function DomainPage() {
  const params = useParams();
  const nameParam = params.name as string;
  const name = ensureSuffix(decodeURIComponent(nameParam));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        <DomainDetails name={name} />
      </main>
    </div>
  );
}
