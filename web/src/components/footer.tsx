import Link from "next/link";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";

const footerLinks = {
  product: [
    { label: "Search Domains", href: "/lookup" },
    { label: "My Domains", href: "/domains" },
    { label: "Documentation", href: "https://selendra.org/docs" },
  ],
  network: [
    { label: "Explorer", href: "https://explorer.selendra.org" },
    { label: "Portal", href: "https://portal.selendra.org" },
    { label: "Faucet", href: "https://faucet.selendra.org" },
  ],
  community: [
    { label: "Telegram", href: "https://t.me/selendranetwork" },
    { label: "X / Twitter", href: "https://x.com/selendranetwork" },
    { label: "GitHub", href: "https://github.com/selendra" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-gray-900 px-4 py-16 text-gray-300">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="https://selendra.org" className="inline-block">
              <Image
                src="https://selendra.org/selendra-logo.png"
                alt="Selendra"
                width={32}
                height={32}
                className="h-8 w-8 brightness-0 invert"
              />
            </Link>
            <p className="mt-4 text-sm text-gray-400">
              Selendra Naming Service — Human-readable names for the Selendra
              blockchain.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Product
            </h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors hover:text-[#26d4c3]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Network */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Network
            </h4>
            <ul className="space-y-3">
              {footerLinks.network.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    target="_blank"
                    className="text-sm transition-colors hover:text-[#26d4c3]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Community
            </h4>
            <ul className="space-y-3">
              {footerLinks.community.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    target="_blank"
                    className="text-sm transition-colors hover:text-[#26d4c3]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-gray-700" />

        <div className="flex flex-col items-center justify-between gap-4 text-sm text-gray-500 sm:flex-row">
          <span>© 2025 Selendra. Built for Cambodia.</span>
          <div className="flex gap-6">
            <Link
              href="https://selendra.org/privacy"
              className="hover:text-gray-300"
            >
              Privacy
            </Link>
            <Link
              href="https://selendra.org/terms"
              className="hover:text-gray-300"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
