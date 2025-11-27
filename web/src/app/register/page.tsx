"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { RegistrationFlow } from "@/components/registration-flow";
import { Loader2 } from "lucide-react";

function RegisterContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get("name") || "";
  const years = parseInt(searchParams.get("years") || "1", 10);

  if (!name) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">No Domain Selected</h2>
          <p className="mt-2 text-gray-600">
            Please search for a domain name first.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-lg bg-[#0db0a4] px-6 py-3 font-semibold text-white hover:bg-[#0a9389]"
          >
            Search Domains
          </Link>
        </div>
      </div>
    );
  }

  return (
    <RegistrationFlow
      name={name}
      years={Math.min(Math.max(years, 1), 10)}
    />
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#e6faf8] to-white">
      <Header />
      <main className="flex-1 px-4 py-12">
        <Suspense
          fallback={
            <div className="flex min-h-[60vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#0db0a4]" />
            </div>
          }
        >
          <RegisterContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
