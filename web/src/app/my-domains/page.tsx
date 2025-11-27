"use client";

import { useAccount } from "wagmi";
import { useConnect } from "wagmi";
import Link from "next/link";
import { Header } from "@/components/header";
import { DomainCard } from "@/components/domain-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOwnedDomains } from "@/hooks/use-sns";
import {
  Loader2,
  Wallet,
  Globe,
  Plus,
  RefreshCw,
  AlertCircle,
  Search,
} from "lucide-react";

function ConnectWalletPrompt() {
  const { connectors, connect } = useConnect();

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-[#0db0a4]/10 flex items-center justify-center mb-4">
          <Wallet className="h-6 w-6 text-[#0db0a4]" />
        </div>
        <CardTitle>Connect Your Wallet</CardTitle>
        <CardDescription>
          Connect your wallet to view and manage your domains.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => {
            const connector = connectors[0];
            if (connector) {
              connect({ connector });
            }
          }}
          className="w-full bg-[#0db0a4] hover:bg-[#0a9389]"
        >
          <Wallet className="h-4 w-4 mr-2" />
          Connect Wallet
        </Button>
      </CardContent>
    </Card>
  );
}

function NoDomainsPrompt() {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Globe className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle>No Domains Found</CardTitle>
        <CardDescription>
          You don&apos;t own any .sel domains yet. Register your first domain to get started.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Link href="/">
          <Button className="w-full bg-[#0db0a4] hover:bg-[#0a9389]">
            <Search className="h-4 w-4 mr-2" />
            Search for a Domain
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-[#0db0a4]" />
      <p className="text-muted-foreground">Loading your domains...</p>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Card className="mx-auto max-w-lg border-red-500/20 bg-red-500/5">
      <CardHeader className="text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <AlertCircle className="h-6 w-6 text-red-500" />
        </div>
        <CardTitle className="text-red-600">Error Loading Domains</CardTitle>
        <CardDescription className="text-red-500/80">
          {error.message}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={onRetry}
          variant="outline"
          className="w-full"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}

function DomainList() {
  const { address } = useAccount();
  const { domains, isLoading, error, refetch } = useOwnedDomains(address ?? "");

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  if (domains.length === 0) {
    return <NoDomainsPrompt />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Your Domains</h2>
          <p className="text-sm text-muted-foreground">
            {domains.length} domain{domains.length > 1 ? "s" : ""} owned
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Link href="/">
            <Button
              size="sm"
              className="bg-[#0db0a4] hover:bg-[#0a9389]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Register New
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {domains.map((domain) => (
          <DomainCard
            key={domain.labelhash}
            name={domain.name}
            expires={domain.expires}
          />
        ))}
      </div>
    </div>
  );
}

export default function MyDomainsPage() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            My <span className="text-[#0db0a4]">Domains</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            View and manage your .sel domain names.
          </p>
        </div>

        {isConnected ? <DomainList /> : <ConnectWalletPrompt />}
      </main>
    </div>
  );
}
