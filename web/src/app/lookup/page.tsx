"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  NameLookupResult,
  AddressLookupResult,
} from "@/components/lookup-result";
import {
  useResolve,
  useReverseResolve,
  useGetOwner,
  useCheckAvailability,
  useGetTextRecord,
} from "@/hooks/use-sns";
import { removeSuffix, ensureSuffix } from "@/lib/utils/namehash";
import { Search, Loader2 } from "lucide-react";

type LookupType = "name" | "address" | null;

// Detect if input is an address or name
function detectInputType(input: string): LookupType {
  const trimmed = input.trim();
  if (!trimmed) return null;
  
  // Ethereum address pattern
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return "address";
  }
  
  // Treat as name (with or without .sel)
  return "name";
}

// Validate name format
function validateName(name: string): { valid: boolean; error?: string } {
  const nameWithoutSuffix = removeSuffix(name);
  
  if (nameWithoutSuffix.length < 3) {
    return { valid: false, error: "Name must be at least 3 characters" };
  }
  if (nameWithoutSuffix.length > 63) {
    return { valid: false, error: "Name must be 63 characters or less" };
  }
  if (!/^[a-z0-9-]+$/.test(nameWithoutSuffix)) {
    return { valid: false, error: "Only lowercase letters, numbers, and hyphens allowed" };
  }
  if (nameWithoutSuffix.startsWith("-") || nameWithoutSuffix.endsWith("-")) {
    return { valid: false, error: "Name cannot start or end with hyphen" };
  }
  return { valid: true };
}

// Text record keys to fetch
const TEXT_RECORD_KEYS = ["email", "url", "avatar", "description", "com.twitter", "com.github", "com.discord", "org.telegram"];

// Hook to fetch multiple text records
function useTextRecords(name: string) {
  const records = TEXT_RECORD_KEYS.map((key) => ({
    key,
    // eslint-disable-next-line react-hooks/rules-of-hooks
    result: useGetTextRecord(name, key),
  }));

  const isLoading = records.some((r) => r.result.isLoading);
  const textRecords = records
    .filter((r) => r.result.value)
    .map((r) => ({
      key: r.key,
      value: r.result.value || "",
    }));

  return { textRecords, isLoading };
}

// Name lookup component
function NameLookup({ name }: { name: string }) {
  const normalizedName = ensureSuffix(name);
  const nameWithoutSuffix = removeSuffix(name);
  
  const { available, isLoading: isCheckingAvailability } = useCheckAvailability(nameWithoutSuffix);
  const { address: resolvedAddress, isLoading: isResolvingAddress } = useResolve(normalizedName);
  const { owner, isLoading: isLoadingOwner } = useGetOwner(normalizedName);
  const { textRecords } = useTextRecords(normalizedName);

  const isLoading = isCheckingAvailability || isResolvingAddress || isLoadingOwner;
  
  // Get expiry - we'd need to add this hook or derive from contract
  // For now, we'll show without expiry unless we implement the hook
  const expires = undefined; // TODO: Implement useGetExpiry hook if needed

  return (
    <NameLookupResult
      name={normalizedName}
      owner={owner}
      resolvedAddress={resolvedAddress}
      textRecords={textRecords}
      expires={expires}
      isLoading={isLoading}
      isAvailable={available && !isCheckingAvailability}
    />
  );
}

// Address lookup component
function AddressLookup({ address }: { address: string }) {
  const { name: primaryName, isLoading: isLoadingName } = useReverseResolve(address);
  
  // TODO: Implement useOwnedDomains to get all domains owned by this address
  // For now, we'll just show the primary name
  const ownedDomains = primaryName ? [primaryName] : [];

  return (
    <AddressLookupResult
      address={address}
      primaryName={primaryName}
      ownedDomains={ownedDomains}
      isLoading={isLoadingName}
    />
  );
}

function LookupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Initialize from URL params
  const initialQuery = searchParams.get("q") || "";
  
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [searchQuery, setSearchQuery] = useState<string | null>(initialQuery || null);
  const [queryType, setQueryType] = useState<LookupType>(initialQuery ? detectInputType(initialQuery) : null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSearch = useCallback((input?: string) => {
    const query = (input ?? searchInput).trim();
    if (!query) {
      setValidationError("Please enter a domain name or address");
      return;
    }

    const type = detectInputType(query);
    setValidationError(null);

    if (type === "name") {
      const validation = validateName(query);
      if (!validation.valid) {
        setValidationError(validation.error || "Invalid name");
        setSearchQuery(null);
        setQueryType(null);
        return;
      }
    }

    setSearchQuery(query);
    setQueryType(type);

    // Update URL
    const newUrl = `/lookup?q=${encodeURIComponent(query)}`;
    router.push(newUrl, { scroll: false });
  }, [searchInput, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              <span className="text-[#0db0a4]">Lookup</span> .sel Domains
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Search for any .sel domain to see its owner and records, or look up an address to find its associated name.
            </p>
          </div>

          {/* Search Box */}
          <Card className="mb-8">
            <CardContent className="py-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Enter a .sel domain or wallet address"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-10 h-12 text-lg"
                  />
                </div>
                <Button
                  onClick={() => handleSearch()}
                  className="h-12 px-8 bg-[#0db0a4] hover:bg-[#0a9389]"
                >
                  Search
                </Button>
              </div>
              
              {validationError && (
                <p className="mt-3 text-sm text-red-500">{validationError}</p>
              )}
              
              <p className="mt-3 text-sm text-muted-foreground">
                Examples: <code className="text-[#0db0a4]">alice.sel</code> or{" "}
                <code className="text-[#0db0a4]">0x1234...abcd</code>
              </p>
            </CardContent>
          </Card>

          {/* Results */}
          {searchQuery && queryType === "name" && (
            <NameLookup name={searchQuery} />
          )}
          
          {searchQuery && queryType === "address" && (
            <AddressLookup address={searchQuery} />
          )}

          {/* Empty State */}
          {!searchQuery && (
            <div className="text-center py-16">
              <div className="mx-auto h-24 w-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                <Search className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-muted-foreground">
                Enter a domain or address to get started
              </h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                Look up any .sel domain to see its owner, resolved address, and text records.
                Or search for a wallet address to find its primary name.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function LookupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0db0a4]" />
      </div>
    }>
      <LookupContent />
    </Suspense>
  );
}
