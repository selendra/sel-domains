"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import { formatEther } from "viem";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCheckAvailability, useGetPrice } from "@/hooks/use-sns";
import { Loader2 } from "lucide-react";

// Mock pricing based on name length (per year) - used when wallet not connected
function getMockBasePrice(name: string): number {
  const len = name.length;
  if (len === 3) return 1000; // Updated: 1,000 SEL/year
  if (len === 4) return 250;  // Updated: 250 SEL/year
  return 50;                  // Updated: 50 SEL/year for 5+ chars
}

const yearOptions = [
  { years: 1, label: "1 Year", discount: 0 },
  { years: 2, label: "2 Years", discount: 0.1 },
  { years: 3, label: "3 Years", discount: 0.15 },
  { years: 4, label: "4 Years", discount: 0.18 },
  { years: 5, label: "5 Years", discount: 0.2 },
  { years: 6, label: "6 Years", discount: 0.22 },
  { years: 7, label: "7 Years", discount: 0.24 },
  { years: 8, label: "8 Years", discount: 0.26 },
  { years: 9, label: "9 Years", discount: 0.28 },
  { years: 10, label: "10 Years", discount: 0.3 },
];

function calculatePrice(
  basePrice: number,
  years: number,
  discount: number
): number {
  return Math.round(basePrice * years * (1 - discount));
}

// Format price from BigInt (wei) to display string
function formatPrice(price: bigint): string {
  const formatted = formatEther(price);
  const num = parseFloat(formatted);
  // Format with appropriate decimal places
  if (num >= 1000) {
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
  } else if (num >= 1) {
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } else {
    return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
  }
}

// Mock availability check - used when wallet not connected
function mockCheckAvailability(name: string): boolean {
  const takenNames = ["selendra", "bitriel", "cambodia", "admin", "root"];
  return !takenNames.includes(name.toLowerCase());
}

// Validate name
function isValidName(name: string): { valid: boolean; error?: string } {
  if (name.length < 3) {
    return { valid: false, error: "Name must be at least 3 characters" };
  }
  if (name.length > 63) {
    return { valid: false, error: "Name must be 63 characters or less" };
  }
  if (!/^[a-z0-9-]+$/.test(name)) {
    return {
      valid: false,
      error: "Only lowercase letters, numbers, and hyphens allowed",
    };
  }
  if (name.startsWith("-") || name.endsWith("-")) {
    return { valid: false, error: "Name cannot start or end with hyphen" };
  }
  return { valid: true };
}

interface SearchResult {
  name: string;
  available: boolean;
  basePrice: number; // For mock display when not connected
  isFromContract: boolean;
}

export function HeroSearch() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  
  const [searchValue, setSearchValue] = useState("");
  const [searchedName, setSearchedName] = useState(""); // Name being looked up
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedYears, setSelectedYears] = useState<number>(1);
  const [isSearching, setIsSearching] = useState(false);

  // Contract hooks - only active when we have a searched name and wallet connected
  const {
    available: contractAvailable,
    isLoading: isAvailabilityLoading,
    error: availabilityError,
  } = useCheckAvailability(searchedName);

  const {
    total: contractPrice,
    isLoading: isPriceLoading,
    error: priceError,
  } = useGetPrice(searchedName, selectedYears);

  const selectedOption = yearOptions.find((opt) => opt.years === selectedYears);
  const discount = selectedOption?.discount || 0;

  // Update result when contract data changes (for connected wallet)
  useEffect(() => {
    if (searchedName && isConnected && !isAvailabilityLoading && !availabilityError) {
      setResult({
        name: searchedName,
        available: contractAvailable,
        basePrice: getMockBasePrice(searchedName), // Fallback for UI
        isFromContract: true,
      });
      setIsSearching(false);
    }
  }, [searchedName, isConnected, contractAvailable, isAvailabilityLoading, availabilityError]);

  // Handle contract errors
  useEffect(() => {
    if (availabilityError && isConnected && searchedName) {
      setError(`Contract error: ${availabilityError.message}. Using mock data.`);
      // Fall back to mock data on error
      setResult({
        name: searchedName,
        available: mockCheckAvailability(searchedName),
        basePrice: getMockBasePrice(searchedName),
        isFromContract: false,
      });
      setIsSearching(false);
    }
  }, [availabilityError, isConnected, searchedName]);

  const handleSearch = () => {
    const name = searchValue.trim().toLowerCase();
    if (!name) return;

    const validation = isValidName(name);
    if (!validation.valid) {
      setError(validation.error || "Invalid name");
      setResult(null);
      setSearchedName("");
      return;
    }

    setError(null);
    setSearchedName(name);

    if (isConnected) {
      // Use contract calls - result will be set via useEffect
      setIsSearching(true);
    } else {
      // Use mock data when not connected
      setResult({
        name: name,
        available: mockCheckAvailability(name),
        basePrice: getMockBasePrice(name),
        isFromContract: false,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleRegister = () => {
    if (!isConnected) {
      // Prompt to connect wallet
      const connector = connectors[0];
      if (connector) {
        connect({ connector });
      }
      return;
    }
    
    // Navigate to registration page
    if (result?.name) {
      window.location.href = `/register?name=${encodeURIComponent(result.name)}&years=${selectedYears}`;
    }
  };

  // Calculate display price
  const getDisplayPrice = (): string => {
    if (isConnected && result?.isFromContract && contractPrice > BigInt(0)) {
      return formatPrice(contractPrice);
    }
    // Mock calculation with discounts
    if (result) {
      return calculatePrice(result.basePrice, selectedYears, discount).toLocaleString();
    }
    return "0";
  };

  const getBasePriceDisplay = (): string => {
    if (isConnected && result?.isFromContract && contractPrice > BigInt(0)) {
      // For base price, divide by years
      const basePerYear = contractPrice / BigInt(selectedYears);
      return formatPrice(basePerYear);
    }
    return result?.basePrice.toString() || "0";
  };

  const isLoading = isSearching || (isConnected && (isAvailabilityLoading || isPriceLoading));

  return (
    <section className="bg-gradient-to-b from-[#e6faf8] to-white px-4 pb-16 pt-32">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
          Your Identity on{" "}
          <span className="text-[#0db0a4]">Selendra</span>
        </h1>
        <p className="mb-10 text-lg text-gray-600 sm:text-xl">
          Human-readable names for the Selendra blockchain. Replace long
          addresses with simple .sel domains.
        </p>

        {/* Search Box */}
        <div className="mx-auto max-w-xl">
          <div className="flex overflow-hidden rounded-xl border-2 border-gray-200 bg-white shadow-lg transition-all focus-within:border-[#26d4c3] focus-within:shadow-[0_4px_6px_-1px_rgba(13,176,164,0.2)]">
            <Input
              type="text"
              placeholder="Search for a name"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 border-0 px-5 py-6 font-mono text-lg shadow-none focus-visible:ring-0"
            />
            <div className="flex items-center border-l border-gray-200 bg-gray-50 px-4 font-mono font-semibold text-[#0a9389]">
              .sel
            </div>
            <Button
              onClick={handleSearch}
              disabled={isLoading}
              className="rounded-none bg-[#0db0a4] px-8 py-6 text-base font-semibold hover:bg-[#0a9389] disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Try: alice, bitriel, cambodia, yourname
            {!isConnected && (
              <span className="ml-1 text-amber-600">
                (Connect wallet for live data)
              </span>
            )}
          </p>

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {/* Loading State */}
          {isLoading && !result && (
            <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-6">
              <Loader2 className="h-5 w-5 animate-spin text-[#0db0a4]" />
              <span className="text-gray-600">Checking availability...</span>
            </div>
          )}

          {/* Result */}
          {result && !isLoading && (
            <div
              className={`mt-6 rounded-xl border p-6 text-left ${
                result.available
                  ? "border-[#4ddcce] bg-[#e6faf8]"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-2xl font-bold">
                  {result.name}.sel
                </span>
                {!result.isFromContract && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    Demo data
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-lg ${
                    result.available ? "text-[#0a9389]" : "text-red-600"
                  }`}
                >
                  ●
                </span>
                <Badge
                  variant={result.available ? "default" : "destructive"}
                  className={
                    result.available ? "bg-[#0db0a4] hover:bg-[#0a9389]" : ""
                  }
                >
                  {result.available ? "Available" : "Already Registered"}
                </Badge>
              </div>

              {result.available && (
                <>
                  {/* Registration Period Selector */}
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        Registration Period
                      </label>
                      <Select
                        value={String(selectedYears)}
                        onValueChange={(value) => setSelectedYears(Number(value))}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {yearOptions.map((option) => (
                            <SelectItem
                              key={option.years}
                              value={String(option.years)}
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span>{option.label}</span>
                                {option.discount > 0 && (
                                  <span className="text-xs text-green-600">
                                    -{Math.round(option.discount * 100)}%
                                  </span>
                                )}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Price Summary */}
                  <div className="mt-4 space-y-2 rounded-lg bg-white/50 p-3">
                    {isPriceLoading && isConnected ? (
                      <div className="flex items-center justify-center gap-2 py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-[#0db0a4]" />
                        <span className="text-sm text-gray-500">Loading price...</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Base price per year</span>
                          <span className="font-mono text-gray-500">
                            {getBasePriceDisplay()} SEL
                          </span>
                        </div>
                        {discount > 0 && !result.isFromContract && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-green-600">
                              Discount ({Math.round(discount * 100)}% off)
                            </span>
                            <span className="font-mono text-green-600">
                              -
                              {(
                                result.basePrice * selectedYears * discount
                              ).toLocaleString()}{" "}
                              SEL
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                          <span className="font-semibold text-gray-900">
                            Total ({selectedYears} {selectedYears === 1 ? "year" : "years"})
                          </span>
                          <div className="text-right">
                            <span className="font-mono text-lg font-bold text-[#0a9389]">
                              {getDisplayPrice()} SEL
                            </span>
                            {discount > 0 && !result.isFromContract && (
                              <span className="ml-2 text-sm text-gray-400 line-through">
                                {(
                                  result.basePrice * selectedYears
                                ).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        {priceError && (
                          <div className="text-xs text-amber-600 mt-1">
                            Could not fetch contract price. Showing estimated price.
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <Button 
                    onClick={handleRegister}
                    disabled={isPriceLoading}
                    className="mt-4 w-full bg-[#0db0a4] py-6 text-base font-semibold hover:bg-[#0a9389] disabled:opacity-50"
                  >
                    {!isConnected ? (
                      "Connect Wallet to Register"
                    ) : isPriceLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      "Register Now"
                    )}
                  </Button>

                  {!isConnected && (
                    <p className="mt-2 text-xs text-center text-gray-500">
                      Connect your wallet to register this domain
                    </p>
                  )}
                </>
              )}

              {/* Show info for taken domains */}
              {!result.available && (
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-600">
                    This domain is already registered. Try searching for a different name.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
