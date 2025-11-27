"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Jazzicon-style identicon generator using deterministic colors
function generateIdenticon(address: string, size: number = 32): string {
  // Create a simple deterministic pattern based on address
  const seed = parseInt(address.slice(2, 10), 16);
  const colors = [
    "#F44336", "#E91E63", "#9C27B0", "#673AB7",
    "#3F51B5", "#2196F3", "#03A9F4", "#00BCD4",
    "#009688", "#4CAF50", "#8BC34A", "#CDDC39",
    "#FFEB3B", "#FFC107", "#FF9800", "#FF5722",
  ];
  
  const bgColor = colors[seed % colors.length];
  const pattern = [];
  
  // Generate a 5x5 symmetric pattern
  for (let i = 0; i < 25; i++) {
    const byte = parseInt(address.slice(2 + (i % 20) * 2, 4 + (i % 20) * 2), 16);
    pattern.push(byte > 127);
  }
  
  // Create SVG string
  const cellSize = size / 5;
  let rects = "";
  
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      if (pattern[y * 5 + x]) {
        // Draw on left side
        rects += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="white" opacity="0.5"/>`;
        // Mirror on right side (except middle column)
        if (x < 2) {
          rects += `<rect x="${(4 - x) * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="white" opacity="0.5"/>`;
        }
      }
    }
  }
  
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="${bgColor}" rx="${size / 8}"/>
      ${rects}
    </svg>`
  )}`;
}

interface AddressDisplayProps {
  address: string;
  resolvedName?: string;
  size?: "sm" | "md" | "lg";
  showCopy?: boolean;
  showExplorer?: boolean;
  showIdenticon?: boolean;
  className?: string;
  truncate?: boolean;
}

function truncateAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function AddressDisplay({
  address,
  resolvedName,
  size = "md",
  showCopy = true,
  showExplorer = true,
  showIdenticon = true,
  className,
  truncate = true,
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showFullAddress, setShowFullAddress] = useState(false);
  
  const sizeClasses = {
    sm: {
      icon: "h-5 w-5",
      text: "text-xs",
      button: "h-6 w-6",
    },
    md: {
      icon: "h-6 w-6",
      text: "text-sm",
      button: "h-8 w-8",
    },
    lg: {
      icon: "h-8 w-8",
      text: "text-base",
      button: "h-9 w-9",
    },
  };

  const iconSizes = {
    sm: 20,
    md: 24,
    lg: 32,
  };

  const handleCopy = async (textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const displayText = resolvedName || (truncate ? truncateAddress(address) : address);
  const explorerUrl = `https://explorer.selendra.org/address/${address}`;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showIdenticon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={generateIdenticon(address, iconSizes[size])}
          alt="Address identicon"
          className={cn("rounded-full", sizeClasses[size].icon)}
        />
      )}
      
      <div className="flex flex-col">
        <div
          className="relative group"
          onMouseEnter={() => resolvedName && setShowFullAddress(true)}
          onMouseLeave={() => setShowFullAddress(false)}
        >
          <span
            className={cn(
              "font-mono cursor-pointer transition-colors hover:text-[#0db0a4]",
              sizeClasses[size].text
            )}
            onClick={() => handleCopy(resolvedName || address)}
          >
            {displayText}
          </span>
          
          {/* Tooltip showing full address when hovering over resolved name */}
          {resolvedName && showFullAddress && (
            <div className="absolute left-0 top-full mt-1 z-10 px-2 py-1 bg-popover border border-border rounded-md shadow-lg">
              <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                {address}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {showCopy && (
          <Button
            variant="ghost"
            size="icon"
            className={cn("text-muted-foreground hover:text-[#0db0a4]", sizeClasses[size].button)}
            onClick={() => handleCopy(address)}
            title="Copy address"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        )}
        
        {showExplorer && (
          <Button
            variant="ghost"
            size="icon"
            className={cn("text-muted-foreground hover:text-[#0db0a4]", sizeClasses[size].button)}
            asChild
            title="View on explorer"
          >
            <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

// Export identicon generator for use in other components
export { generateIdenticon, truncateAddress };
