"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTransferDomain } from "@/hooks/use-domain-management";
import {
  Loader2,
  Check,
  AlertCircle,
  ArrowRight,
  AlertTriangle,
  X,
} from "lucide-react";
import type { Address } from "viem";

interface TransferDomainProps {
  name: string;
  currentOwner: Address;
}

export function TransferDomain({ name, currentOwner }: TransferDomainProps) {
  const [newOwner, setNewOwner] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    transferDomain,
    isPending,
    isConfirming,
    isSuccess,
    error,
  } = useTransferDomain();

  const isLoading = isPending || isConfirming;
  const isValidAddress = newOwner.startsWith("0x") && newOwner.length === 42;

  const handleTransfer = () => {
    if (isValidAddress) {
      transferDomain(name, currentOwner, newOwner as Address);
      setShowConfirm(false);
    }
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
              <h3 className="font-semibold text-emerald-600">Transfer Complete</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Domain has been transferred to{" "}
                <span className="font-mono text-xs">{newOwner}</span>
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
          <ArrowRight className="h-4 w-4 text-[#0db0a4]" />
          Transfer Domain
        </CardTitle>
        <CardDescription>
          Transfer ownership of this domain to another address.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700 dark:text-amber-400">
            <p className="font-medium">Warning: This action cannot be undone</p>
            <p className="mt-1 text-amber-600 dark:text-amber-500">
              Once transferred, you will lose control of this domain unless the new owner transfers it back.
            </p>
          </div>
        </div>

        {/* Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            New Owner Address
          </label>
          <Input
            value={newOwner}
            onChange={(e) => setNewOwner(e.target.value)}
            placeholder="0x..."
            disabled={isLoading}
            className="font-mono text-sm"
          />
          {newOwner && !isValidAddress && (
            <p className="text-xs text-amber-500">
              Please enter a valid Ethereum address
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" />
            {error.message}
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirm ? (
          <div className="space-y-4 p-4 rounded-lg border border-red-500/20 bg-red-500/5">
            <p className="text-sm font-medium">
              Are you sure you want to transfer <span className="text-[#0db0a4]">{name}</span> to:
            </p>
            <p className="font-mono text-xs break-all bg-background/50 p-2 rounded">
              {newOwner}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                disabled={isLoading}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleTransfer}
                disabled={isLoading || !isValidAddress}
                className="flex-1 bg-red-500 hover:bg-red-600"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Confirm Transfer
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={!isValidAddress || isLoading}
            variant="outline"
            className="w-full border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-600"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Transfer Domain
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
