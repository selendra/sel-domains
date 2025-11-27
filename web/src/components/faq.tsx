"use client";

import { useState } from "react";

const faqs = [
  {
    question: "What is SNS?",
    answer:
      'SNS (Selendra Naming Service) is a decentralized naming system for the Selendra blockchain. It allows you to register human-readable names like "alice.sel" that can be used instead of long wallet addresses.',
  },
  {
    question: "How long can I register a name?",
    answer:
      "You can register a name for 1 to 5 years. Longer registrations get a 10% discount. You can always renew before your name expires.",
  },
  {
    question: "What happens if my name expires?",
    answer:
      "After expiration, there's a 90-day grace period where only you can renew the name. After the grace period, the name becomes available for anyone to register.",
  },
  {
    question: "Can I sell or transfer my name?",
    answer:
      "Yes! Your .sel domain is an ERC-721 NFT. You can transfer it to another wallet or sell it on any NFT marketplace that supports Selendra.",
  },
  {
    question: "What records can I store?",
    answer:
      "You can store EVM addresses, Substrate addresses (SS58), text records (avatar, email, website, social links), content hashes (IPFS/Arweave), and contract ABIs.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="bg-gray-50 px-4 py-20">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="flex w-full items-center justify-between px-6 py-4 text-left font-semibold text-gray-900 transition-colors hover:bg-gray-50"
              >
                {faq.question}
                <span className="ml-4 text-xl text-gray-400">
                  {openIndex === index ? "−" : "+"}
                </span>
              </button>
              {openIndex === index && (
                <div className="border-t border-gray-100 px-6 py-4 text-gray-600">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
