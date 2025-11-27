"use client";

import { useState } from "react";
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

// Pricing based on name length (per year)
function getBasePrice(name: string): number {
  const len = name.length;
  if (len === 3) return 500;
  if (len === 4) return 100;
  return 5;
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

// Mock availability check
function checkAvailability(name: string): boolean {
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
  basePrice: number;
}

export function HeroSearch() {
  const [searchValue, setSearchValue] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedYears, setSelectedYears] = useState<number>(1);

  const selectedOption = yearOptions.find((opt) => opt.years === selectedYears);
  const discount = selectedOption?.discount || 0;

  const handleSearch = () => {
    const name = searchValue.trim().toLowerCase();
    if (!name) return;

    const validation = isValidName(name);
    if (!validation.valid) {
      setError(validation.error || "Invalid name");
      setResult(null);
      return;
    }

    setError(null);
    setResult({
      name: name,
      available: checkAvailability(name),
      basePrice: getBasePrice(name),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

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
              className="rounded-none bg-[#0db0a4] px-8 py-6 text-base font-semibold hover:bg-[#0a9389]"
            >
              Search
            </Button>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Try: alice, bitriel, cambodia, yourname
          </p>

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              className={`mt-6 rounded-xl border p-6 text-left ${
                result.available
                  ? "border-[#4ddcce] bg-[#e6faf8]"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div className="mb-2 font-mono text-2xl font-bold">
                {result.name}.sel
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
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Base price per year</span>
                      <span className="font-mono text-gray-500">
                        {result.basePrice} SEL
                      </span>
                    </div>
                    {discount > 0 && (
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
                          {calculatePrice(
                            result.basePrice,
                            selectedYears,
                            discount
                          ).toLocaleString()}{" "}
                          SEL
                        </span>
                        {discount > 0 && (
                          <span className="ml-2 text-sm text-gray-400 line-through">
                            {(
                              result.basePrice * selectedYears
                            ).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button className="mt-4 w-full bg-[#0db0a4] py-6 text-base font-semibold hover:bg-[#0a9389]">
                    Register Now
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
