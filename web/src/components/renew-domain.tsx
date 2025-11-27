"use client";

import { useState } from "react";
import { formatEther } from "viem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRenewDomain, useGetPrice } from "@/hooks/use-sns";
import {
  Loader2,
  Check,
  AlertCircle,
  RefreshCw,
  Calendar,
  Coins,
} from "lucide-react";

interface RenewDomainProps {
  name: string;
  currentExpiry: bigint;
}

function formatPrice(price: bigint): string {
  const formatted = formatEther(price);
  const num = parseFloat(formatted);
  if (num >= 1000) {
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
  } else if (num >= 1) {
    return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
  } else {
    return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
  }
}

function formatDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function RenewDomain({ name, currentExpiry }: RenewDomainProps) {
  const [years, setYears] = useState(1);

  const {
    total: price,
    isLoading: isPriceLoading,
    error: priceError,
  } = useGetPrice(name, years);

  const {
    renew,
    isPending,
    isConfirming,
    isSuccess,
    error: renewError,
  } = useRenewDomain();

  const isLoading = isPending || isConfirming;

  // Calculate new expiry date
  const SECONDS_PER_YEAR = BigInt(365 * 24 * 60 * 60);
  const newExpiry = currentExpiry + BigInt(years) * SECONDS_PER_YEAR;

  const handleRenew = () => {
    renew(name, years);
  };

  if (isSuccess) {
    return (
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Check className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-600">Renewal Complete</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your domain has been renewed for {years} year{years > 1 ? "s" : ""}.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                New expiry: <span className="font-medium">{formatDate(newExpiry)}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-[#0db0a4]" />
          Renew Domain
        </CardTitle>
        <CardDescription>
          Extend the registration period for this domain.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Expiry */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Current Expiry
          </div>
          <span className="font-medium">{formatDate(currentExpiry)}</span>
        </div>

        {/* Year Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Renewal Period
          </label>
          <Select
            value={years.toString()}
            onValueChange={(value) => setYears(parseInt(value))}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select years" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y} year{y > 1 ? "s" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* New Expiry */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-[#0db0a4]/5 border border-[#0db0a4]/10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 text-[#0db0a4]" />
            New Expiry
          </div>
          <span className="font-medium text-[#0db0a4]">{formatDate(newExpiry)}</span>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Coins className="h-4 w-4" />
            Renewal Cost
          </div>
          <span className="font-semibold">
            {isPriceLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              `${formatPrice(price)} SEL`
            )}
          </span>
        </div>

        {/* Errors */}
        {(priceError || renewError) && (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" />
            {(priceError || renewError)?.message}
          </div>
        )}

        {/* Renew Button */}
        <Button
          onClick={handleRenew}
          disabled={isLoading || isPriceLoading || !price}
          className="w-full bg-[#0db0a4] hover:bg-[#0a9389]"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isPending ? "Confirm in Wallet..." : "Renewing..."}
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Renew for {formatPrice(price)} SEL
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
