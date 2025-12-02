"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    useSetResolver,
    useIsResolverOutdated,
} from "@/hooks/use-domain-management";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import {
    Loader2,
    AlertTriangle,
    Check,
    ArrowUpCircle,
} from "lucide-react";
import type { Address } from "viem";

interface ResolverUpgradeProps {
    name: string;
    currentResolver: Address | undefined;
    isOwner: boolean;
    onUpgradeSuccess?: () => void;
}

export function ResolverUpgrade({
    name,
    currentResolver,
    isOwner,
    onUpgradeSuccess,
}: ResolverUpgradeProps) {
    const [showSuccess, setShowSuccess] = useState(false);
    const isOutdated = useIsResolverOutdated(currentResolver);

    const {
        setResolver,
        isPending,
        isConfirming,
        isSuccess,
        error,
    } = useSetResolver();

    const isLoading = isPending || isConfirming;

    useEffect(() => {
        if (isSuccess) {
            setShowSuccess(true);
            onUpgradeSuccess?.();
            const timer = setTimeout(() => setShowSuccess(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [isSuccess, onUpgradeSuccess]);

    // Don't show if resolver is up to date
    if (!isOutdated) {
        return null;
    }

    const handleUpgrade = () => {
        setResolver(name, CONTRACT_ADDRESSES.PublicResolver);
    };

    return (
        <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                        <AlertTriangle className="h-6 w-6 text-amber-500" />
                    </div>
                    <div className="flex-1 space-y-3">
                        <div>
                            <h3 className="font-semibold text-amber-700 dark:text-amber-400">
                                Resolver Upgrade Required
                            </h3>
                            <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                                Your domain uses an outdated resolver. Upgrade to the new MultiChain Resolver
                                to enable wallet address resolution in MetaMask and other wallets.
                            </p>
                        </div>

                        {isOwner ? (
                            <div className="flex items-center gap-3">
                                <Button
                                    onClick={handleUpgrade}
                                    disabled={isLoading || showSuccess}
                                    size="sm"
                                    className="bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Upgrading...
                                        </>
                                    ) : showSuccess ? (
                                        <>
                                            <Check className="h-4 w-4 mr-2" />
                                            Upgraded!
                                        </>
                                    ) : (
                                        <>
                                            <ArrowUpCircle className="h-4 w-4 mr-2" />
                                            Upgrade Resolver
                                        </>
                                    )}
                                </Button>
                                {error && (
                                    <p className="text-xs text-red-500">
                                        {error.message}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-amber-600 dark:text-amber-500">
                                Only the domain owner can upgrade the resolver.
                            </p>
                        )}

                        {showSuccess && (
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                <Check className="h-4 w-4" />
                                Resolver upgraded successfully! You can now set your wallet addresses.
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
