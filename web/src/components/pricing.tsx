"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const basePrices = {
  "3": 500, // 3 characters
  "4": 100, // 4 characters
  "5+": 5, // 5+ characters
};

const yearOptions = [
  { years: 1, label: "1 Year", discount: 0 },
  { years: 2, label: "2 Years", discount: 0.1 },
  { years: 3, label: "3 Years", discount: 0.15 },
  { years: 4, label: "4 Years", discount: 0.18 },
  { years: 5, label: "5 Years", discount: 0.2 },
  { years: 6, label: "6 Years", discount: 0.22 },
  { years: 7, label: "7 Years", discount: 0.24 },
  { years: 8, label: "8 Years", discount: 0.26 },
  { years: 9, label: "9 Years", discount: 0.28 },
  { years: 10, label: "10 Years", discount: 0.3 },
];

function calculatePrice(
  basePrice: number,
  years: number,
  discount: number
): number {
  return Math.round(basePrice * years * (1 - discount));
}

export function Pricing() {
  const [selectedYears, setSelectedYears] = useState<number>(1);

  const selectedOption = yearOptions.find((opt) => opt.years === selectedYears);
  const discount = selectedOption?.discount || 0;

  const pricingTiers = [
    {
      length: "3 characters",
      example: "abc.sel",
      basePrice: basePrices["3"],
      price: calculatePrice(basePrices["3"], selectedYears, discount),
    },
    {
      length: "4 characters",
      example: "john.sel",
      basePrice: basePrices["4"],
      price: calculatePrice(basePrices["4"], selectedYears, discount),
    },
    {
      length: "5+ characters",
      example: "alice.sel",
      basePrice: basePrices["5+"],
      price: calculatePrice(basePrices["5+"], selectedYears, discount),
    },
  ];

  return (
    <section id="pricing" className="bg-gray-50 px-4 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
            Simple Pricing
          </h2>
          <p className="text-lg text-gray-600">
            Affordable names for everyone
          </p>
        </div>

        {/* Year Selection */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="text-sm font-medium text-gray-700">
            Registration Period:
          </span>
          <Select
            value={String(selectedYears)}
            onValueChange={(value) => setSelectedYears(Number(value))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((option) => (
                <SelectItem key={option.years} value={String(option.years)}>
                  <span className="flex items-center gap-2">
                    <span>{option.label}</span>
                    {option.discount > 0 && (
                      <span className="text-xs text-green-600">
                        -{Math.round(option.discount * 100)}%
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {/* Header */}
          <div className="grid grid-cols-4 gap-4 border-b border-gray-100 bg-gray-50 px-6 py-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            <span>Name Length</span>
            <span>Example</span>
            <span className="text-center">Per Year</span>
            <span className="text-right">Total</span>
          </div>

          {/* Rows */}
          {pricingTiers.map((tier, index) => (
            <div
              key={index}
              className={`grid grid-cols-4 gap-4 px-6 py-5 ${
                index !== pricingTiers.length - 1
                  ? "border-b border-gray-100"
                  : ""
              }`}
            >
              <span className="font-semibold text-gray-900">{tier.length}</span>
              <span className="font-mono text-gray-600">{tier.example}</span>
              <span className="text-center text-gray-500">
                {tier.basePrice} SEL
              </span>
              <div className="text-right">
                <span className="font-bold text-[#0a9389]">
                  {tier.price.toLocaleString()} SEL
                </span>
                {discount > 0 && (
                  <span className="ml-2 text-sm text-gray-400 line-through">
                    {(tier.basePrice * selectedYears).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-6 rounded-lg bg-[#0a9389]/10 p-4 text-center">
          {selectedYears >= 2 ? (
            <p className="text-sm text-gray-700">
              💡 You save{" "}
              <span className="font-bold text-[#0a9389]">
                {Math.round(discount * 100)}%
              </span>{" "}
              by registering for {selectedYears} years!
            </p>
          ) : (
            <p className="text-sm text-gray-700">
              💡 Register for 2+ years and get up to{" "}
              <span className="font-bold text-[#0a9389]">30% off</span>!
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
