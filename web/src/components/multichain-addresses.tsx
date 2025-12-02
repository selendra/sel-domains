"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    useSetMultiChainAddress,
    useGetMultiChainAddress,
} from "@/hooks/use-domain-management";
import {
    COIN_TYPES,
    COIN_TYPE_INFO,
    POPULAR_COIN_TYPES,
} from "@/lib/contracts";
import {
    Loader2,
    Check,
    AlertCircle,
    Save,
    Plus,
    Trash2,
    Link,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { toHex, fromHex, isHex } from "viem";

interface MultiChainAddressesProps {
    name: string;
    isOwner: boolean;
}

// Helper to convert address string to bytes for storage
function addressToBytes(address: string, coinType: number): `0x${string}` {
    // For EVM chains, address is already hex
    if (isEvmChain(coinType)) {
        if (!address.startsWith("0x") || address.length !== 42) {
            throw new Error("Invalid EVM address");
        }
        return address.toLowerCase() as `0x${string}`;
    }
    // For other chains, encode as UTF-8 hex
    return toHex(address) as `0x${string}`;
}

// Helper to convert bytes back to address string
function bytesToAddress(bytes: `0x${string}`, coinType: number): string {
    if (!bytes || bytes === "0x") return "";

    // For EVM chains, bytes is the address
    if (isEvmChain(coinType)) {
        return bytes;
    }
    // For other chains, decode from UTF-8 hex
    try {
        return fromHex(bytes, "string");
    } catch {
        return bytes;
    }
}

// Check if coin type is an EVM chain
function isEvmChain(coinType: number): boolean {
    const evmCoinTypes: number[] = [
        COIN_TYPES.ETH,
        COIN_TYPES.BNB,
        COIN_TYPES.MATIC,
        COIN_TYPES.AVAX,
        COIN_TYPES.FTM,
        COIN_TYPES.ARB,
        COIN_TYPES.CELO,
        COIN_TYPES.MOVR,
        COIN_TYPES.GLMR,
    ];
    return evmCoinTypes.includes(coinType);
}

// Get address placeholder based on coin type
function getAddressPlaceholder(coinType: number): string {
    const info = COIN_TYPE_INFO[coinType];
    if (!info) return "Enter address";

    switch (coinType) {
        case COIN_TYPES.ETH:
            return "0x... (Ethereum address)";
        case COIN_TYPES.BTC:
            return "bc1q... or 1... or 3...";
        case COIN_TYPES.SOL:
            return "Base58 address";
        case COIN_TYPES.DOT:
            return "1... (SS58 format)";
        case COIN_TYPES.ADA:
            return "addr1...";
        case COIN_TYPES.XRP:
            return "r...";
        case COIN_TYPES.DOGE:
        case COIN_TYPES.LTC:
            return "L... or ltc1...";
        case COIN_TYPES.ATOM:
            return "cosmos1...";
        case COIN_TYPES.NEAR:
            return "account.near";
        case COIN_TYPES.TRX:
            return "T...";
        case COIN_TYPES.TON:
            return "UQ... or EQ...";
        default:
            if (isEvmChain(coinType)) {
                return "0x...";
            }
            return "Enter address";
    }
}

// Validate address based on coin type (basic validation)
function validateAddress(address: string, coinType: number): boolean {
    if (!address) return false;

    if (isEvmChain(coinType)) {
        return address.startsWith("0x") && address.length === 42 && isHex(address);
    }

    // Basic length validation for other chains
    switch (coinType) {
        case COIN_TYPES.BTC:
            return address.length >= 26 && address.length <= 62;
        case COIN_TYPES.SOL:
            return address.length >= 32 && address.length <= 44;
        case COIN_TYPES.DOT:
            return address.length >= 46 && address.length <= 48;
        case COIN_TYPES.XRP:
            return address.startsWith("r") && address.length >= 25 && address.length <= 35;
        default:
            return address.length > 0;
    }
}

function ChainAddressInput({
    name,
    coinType,
    isOwner,
    defaultAddress,
    isLoadingAddress,
    onRemove,
}: {
    name: string;
    coinType: number;
    isOwner: boolean;
    defaultAddress: string;
    isLoadingAddress: boolean;
    onRemove?: () => void;
}) {
    const [localAddress, setLocalAddress] = useState(defaultAddress);
    const [showSuccess, setShowSuccess] = useState(false);
    const [savedAddress, setSavedAddress] = useState<string | null>(null);

    const info = COIN_TYPE_INFO[coinType];
    const {
        setMultiChainAddress,
        isPending,
        isConfirming,
        isSuccess,
        error,
    } = useSetMultiChainAddress();

    const comparisonAddress = savedAddress !== null ? savedAddress : defaultAddress;
    const hasChanges = localAddress !== comparisonAddress;
    const isLoading = isPending || isConfirming;
    const isValidAddress = validateAddress(localAddress, coinType);

    useEffect(() => {
        if (isSuccess && savedAddress !== null) {
            setShowSuccess(true);
            const timer = setTimeout(() => setShowSuccess(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isSuccess, savedAddress]);

    useEffect(() => {
        if (savedAddress === null && defaultAddress) {
            setLocalAddress(defaultAddress);
        }
    }, [defaultAddress, savedAddress]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalAddress(e.target.value);
        setShowSuccess(false);
        setSavedAddress(null);
    };

    const handleSave = () => {
        if (isValidAddress) {
            setSavedAddress(localAddress);
            try {
                const addressBytes = addressToBytes(localAddress, coinType);
                setMultiChainAddress(name, BigInt(coinType), addressBytes);
            } catch (err) {
                console.error("Failed to encode address:", err);
            }
        }
    };

    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2 min-w-[100px]">
                <span className="text-lg">{info?.icon ?? "🔗"}</span>
                <span className="font-medium text-sm">{info?.symbol ?? `Coin ${coinType}`}</span>
            </div>
            <div className="flex-1 space-y-1">
                <div className="flex gap-2">
                    <Input
                        value={localAddress}
                        onChange={handleChange}
                        placeholder={isLoadingAddress ? "Loading..." : getAddressPlaceholder(coinType)}
                        disabled={!isOwner || isLoading || isLoadingAddress}
                        className="flex-1 font-mono text-sm h-9"
                    />
                    {isOwner && (
                        <>
                            <Button
                                onClick={handleSave}
                                disabled={isLoading || !isValidAddress || !hasChanges}
                                size="sm"
                                className="bg-[#0db0a4] hover:bg-[#0a9389] disabled:opacity-50 h-9"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                            </Button>
                            {onRemove && (
                                <Button
                                    onClick={onRemove}
                                    size="sm"
                                    variant="ghost"
                                    className="h-9 text-muted-foreground hover:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </>
                    )}
                </div>
                {localAddress && !isValidAddress && hasChanges && (
                    <p className="text-xs text-amber-500">
                        Invalid {info?.name || "chain"} address format
                    </p>
                )}
                {error && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {error.message}
                    </p>
                )}
                {showSuccess && (
                    <p className="text-xs text-emerald-500 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Saved successfully
                    </p>
                )}
            </div>
        </div>
    );
}

function ChainAddressInputWrapper({
    name,
    coinType,
    isOwner,
    onRemove,
}: {
    name: string;
    coinType: number;
    isOwner: boolean;
    onRemove?: () => void;
}) {
    const { addressBytes, isLoading } = useGetMultiChainAddress(
        name,
        BigInt(coinType)
    );

    const address = addressBytes ? bytesToAddress(addressBytes, coinType) : "";

    return (
        <ChainAddressInput
            key={`${coinType}-${address}`}
            name={name}
            coinType={coinType}
            isOwner={isOwner}
            defaultAddress={address}
            isLoadingAddress={isLoading}
            onRemove={onRemove}
        />
    );
}

export function MultiChainAddresses({ name, isOwner }: MultiChainAddressesProps) {
    const [expanded, setExpanded] = useState(false);
    const [showAddChain, setShowAddChain] = useState(false);
    const [selectedChains, setSelectedChains] = useState<number[]>([
        COIN_TYPES.ETH,
        COIN_TYPES.BTC,
        COIN_TYPES.SOL,
    ]);

    // All available coin types not yet selected
    const availableChains = POPULAR_COIN_TYPES.filter(
        (ct) => !selectedChains.includes(ct)
    );

    const handleAddChain = (coinType: string) => {
        const ct = parseInt(coinType);
        if (!selectedChains.includes(ct)) {
            setSelectedChains([...selectedChains, ct]);
        }
        setShowAddChain(false);
    };

    const handleRemoveChain = (coinType: number) => {
        setSelectedChains(selectedChains.filter((ct) => ct !== coinType));
    };

    // Show first 3 chains when collapsed, all when expanded
    const visibleChains = expanded ? selectedChains : selectedChains.slice(0, 3);
    const hasMoreChains = selectedChains.length > 3;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Link className="h-4 w-4 text-[#0db0a4]" />
                        Multi-Chain Addresses
                    </span>
                    <div className="flex items-center gap-2">
                        {!isOwner && (
                            <Badge variant="secondary" className="text-xs">
                                Read Only
                            </Badge>
                        )}
                        {isOwner && availableChains.length > 0 && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowAddChain(!showAddChain)}
                                className="h-7 text-xs"
                            >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Chain
                            </Button>
                        )}
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                    Set addresses for different blockchains. Your ETH address is used by wallets like MetaMask to resolve this domain.
                </p>

                {showAddChain && (
                    <div className="mb-4">
                        <Select onValueChange={handleAddChain}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a blockchain" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableChains.map((ct) => {
                                    const info = COIN_TYPE_INFO[ct];
                                    return (
                                        <SelectItem key={ct} value={ct.toString()}>
                                            <span className="flex items-center gap-2">
                                                <span>{info?.icon || "🔗"}</span>
                                                <span>{info?.name || `Coin ${ct}`}</span>
                                                <span className="text-muted-foreground text-xs">
                                                    ({info?.symbol || ct})
                                                </span>
                                            </span>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="space-y-2">
                    {visibleChains.map((coinType) => (
                        <ChainAddressInputWrapper
                            key={coinType}
                            name={name}
                            coinType={coinType}
                            isOwner={isOwner}
                            onRemove={
                                isOwner && selectedChains.length > 1
                                    ? () => handleRemoveChain(coinType)
                                    : undefined
                            }
                        />
                    ))}
                </div>

                {hasMoreChains && (
                    <Button
                        variant="ghost"
                        onClick={() => setExpanded(!expanded)}
                        className="w-full mt-2 text-muted-foreground hover:text-foreground"
                    >
                        {expanded ? (
                            <>
                                <ChevronUp className="h-4 w-4 mr-2" />
                                Show Less
                            </>
                        ) : (
                            <>
                                <ChevronDown className="h-4 w-4 mr-2" />
                                Show {selectedChains.length - 3} More Chains
                            </>
                        )}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
