"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useSetAddress,
  useSetTextRecord,
  TEXT_RECORD_KEYS,
  TEXT_RECORD_LABELS,
} from "@/hooks/use-domain-management";
import { useResolve, useGetTextRecord } from "@/hooks/use-sns";
import {
  Loader2,
  Check,
  AlertCircle,
  Save,
  Globe,
  Mail,
  User,
  AtSign,
  Github,
  MessageCircle,
  Send,
  Wallet,
} from "lucide-react";
import type { Address } from "viem";

interface RecordEditorProps {
  name: string;
  isOwner: boolean;
}

const RECORD_ICONS: Record<string, React.ReactNode> = {
  avatar: <User className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  url: <Globe className="h-4 w-4" />,
  description: <AtSign className="h-4 w-4" />,
  "com.twitter": <AtSign className="h-4 w-4" />,
  "com.github": <Github className="h-4 w-4" />,
  "com.discord": <MessageCircle className="h-4 w-4" />,
  "org.telegram": <Send className="h-4 w-4" />,
};

function TextRecordInput({
  recordKey,
  name,
  isOwner,
  defaultValue,
  isLoadingValue,
}: {
  recordKey: string;
  name: string;
  isOwner: boolean;
  defaultValue: string;
  isLoadingValue: boolean;
}) {
  const [localValue, setLocalValue] = useState(defaultValue);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    setTextRecord,
    isPending,
    isConfirming,
    isSuccess,
    error,
  } = useSetTextRecord();

  const hasChanges = localValue !== defaultValue;

  // Show success message when transaction completes
  if (isSuccess && !showSuccess && !hasChanges) {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    setShowSuccess(false);
  };

  const handleSave = () => {
    setTextRecord(name, recordKey, localValue);
  };

  const isLoading = isPending || isConfirming;
  const label = TEXT_RECORD_LABELS[recordKey] || recordKey;
  const icon = RECORD_ICONS[recordKey];

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {label}
      </label>
      <div className="flex gap-2">
        <Input
          value={localValue}
          onChange={handleChange}
          placeholder={isLoadingValue ? "Loading..." : `Enter ${label.toLowerCase()}`}
          disabled={!isOwner || isLoading || isLoadingValue}
          className="flex-1"
        />
        {isOwner && hasChanges && (
          <Button
            onClick={handleSave}
            disabled={isLoading}
            size="sm"
            className="bg-[#0db0a4] hover:bg-[#0a9389]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
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
  );
}

function TextRecordInputWrapper({
  recordKey,
  name,
  isOwner,
}: {
  recordKey: string;
  name: string;
  isOwner: boolean;
}) {
  const { value: currentValue, isLoading: isLoadingValue } = useGetTextRecord(
    name,
    recordKey
  );

  // Use key to reset component state when currentValue changes from external update
  return (
    <TextRecordInput
      key={`${recordKey}-${currentValue ?? ""}`}
      recordKey={recordKey}
      name={name}
      isOwner={isOwner}
      defaultValue={currentValue ?? ""}
      isLoadingValue={isLoadingValue}
    />
  );
}

function AddressInput({
  name,
  isOwner,
  defaultAddress,
  isLoadingAddress,
}: {
  name: string;
  isOwner: boolean;
  defaultAddress: string;
  isLoadingAddress: boolean;
}) {
  const [localAddress, setLocalAddress] = useState(defaultAddress);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    setAddress,
    isPending,
    isConfirming,
    isSuccess,
    error,
  } = useSetAddress();

  const hasChanges = localAddress.toLowerCase() !== defaultAddress.toLowerCase();
  const isLoading = isPending || isConfirming;
  const isValidAddress = localAddress.startsWith("0x") && localAddress.length === 42;

  // Show success message when transaction completes
  if (isSuccess && !showSuccess && !hasChanges) {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalAddress(e.target.value);
    setShowSuccess(false);
  };

  const handleSave = () => {
    if (isValidAddress) {
      setAddress(name, localAddress as Address);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="h-4 w-4 text-[#0db0a4]" />
          Primary Address
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground mb-3">
          The address that this domain resolves to.
        </p>
        <div className="flex gap-2">
          <Input
            value={localAddress}
            onChange={handleChange}
            placeholder={isLoadingAddress ? "Loading..." : "0x..."}
            disabled={!isOwner || isLoading || isLoadingAddress}
            className="flex-1 font-mono text-sm"
          />
          {isOwner && hasChanges && (
            <Button
              onClick={handleSave}
              disabled={isLoading || !isValidAddress}
              size="sm"
              className="bg-[#0db0a4] hover:bg-[#0a9389]"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        {localAddress && !isValidAddress && hasChanges && (
          <p className="text-xs text-amber-500">
            Please enter a valid address (0x followed by 40 hex characters)
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
            Address updated successfully
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AddressInputWrapper({
  name,
  isOwner,
}: {
  name: string;
  isOwner: boolean;
}) {
  const { address: resolvedAddress, isLoading } = useResolve(name);
  
  // Use key to reset component state when address changes from external update
  return (
    <AddressInput
      key={resolvedAddress ?? "empty"}
      name={name}
      isOwner={isOwner}
      defaultAddress={resolvedAddress ?? ""}
      isLoadingAddress={isLoading}
    />
  );
}

export function RecordEditor({ name, isOwner }: RecordEditorProps) {
  return (
    <div className="space-y-6">
      {/* Primary Address */}
      <AddressInputWrapper name={name} isOwner={isOwner} />

      {/* Text Records */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Text Records</span>
            {!isOwner && (
              <Badge variant="secondary" className="text-xs">
                Read Only
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Additional information associated with your domain.
          </p>
          <div className="grid gap-4">
            {TEXT_RECORD_KEYS.map((key) => (
              <TextRecordInputWrapper
                key={key}
                recordKey={key}
                name={name}
                isOwner={isOwner}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
