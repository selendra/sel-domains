"use client";

import Link from "next/link";
import Image from "next/image";
import { ConnectWallet } from "@/components/connect-wallet";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="https://selendra.org/selendra-logo.png"
            alt="Selendra"
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <span className="text-xl font-bold">
            <span className="text-[#0db0a4]">SNS</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/lookup"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-[#0a9389]"
          >
            Lookup
          </Link>
          <Link
            href="/my-domains"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-[#0a9389]"
          >
            My Domains
          </Link>
          <Link
            href="#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-[#0a9389]"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-[#0a9389]"
          >
            Pricing
          </Link>
          <Link
            href="#faq"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-[#0a9389]"
          >
            FAQ
          </Link>
          <Link
            href="https://docs.selendra.org"
            target="_blank"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-[#0a9389]"
          >
            Docs
          </Link>
        </nav>

        <ConnectWallet />
      </div>
    </header>
  );
}
