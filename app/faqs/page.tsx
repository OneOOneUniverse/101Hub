"use client";

import { useEffect, useState } from "react";
import type { FAQ } from "@/lib/site-content-types";

export default function FAQsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFAQs();
  }, []);

  async function loadFAQs() {
    try {
      const response = await fetch("/api/store", { cache: "no-store" });
      const content = await response.json();
      const faqList = content.faqs || [];
      const sorted = [...faqList].sort((a: FAQ, b: FAQ) => (a.order ?? 0) - (b.order ?? 0));
      setFaqs(sorted);
    } catch (error) {
      console.error("Failed to load FAQs:", error);
    } finally {
      setLoading(false);
    }
  }

  const categories = Array.from(new Set(faqs.map((faq) => faq.category).filter(Boolean))) as string[];
  const filteredFaqs = selectedCategory ? faqs.filter((faq) => faq.category === selectedCategory) : faqs;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 px-4 sm:px-6 py-8 sm:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 px-4 sm:px-6 py-8 sm:py-16">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Find answers to common questions about our products, services, and policies.
          </p>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="mb-8 sm:mb-12">
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full font-medium transition-all ${
                  selectedCategory === null
                    ? "bg-black text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full font-medium transition-all ${
                    selectedCategory === category
                      ? "bg-black text-white"
                      : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* FAQs List */}
        <div className="space-y-4 sm:space-y-6">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No FAQs found in this category.</p>
            </div>
          ) : (
            filteredFaqs.map((faq) => (
              <div
                key={faq.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                  className="w-full px-4 sm:px-6 py-4 sm:py-5 text-left bg-white hover:bg-gray-50 transition-colors flex items-start justify-between gap-3"
                >
                  <span className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                      {faq.question}
                    </h3>
                    {faq.category && (
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        {faq.category}
                      </p>
                    )}
                  </span>
                  <span
                    className={`flex-shrink-0 text-2xl transition-transform duration-300 ${
                      expandedId === faq.id ? "rotate-180" : ""
                    }`}
                  >
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  </span>
                </button>

                {/* Expanded Content */}
                {expandedId === faq.id && (
                  <div className="border-t border-gray-200 bg-gray-50 px-4 sm:px-6 py-4 sm:py-5 space-y-4">
                    <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                      {faq.answer}
                    </p>

                    {/* Video */}
                    {faq.videoUrl && (
                      <div className="mt-4">
                        <iframe
                          width="100%"
                          height="300"
                          src={faq.videoUrl}
                          title={faq.question}
                          className="rounded-lg"
                          allowFullScreen
                        />
                      </div>
                    )}

                    {/* Image */}
                    {faq.imageUrl && (
                      <div className="mt-4">
                        <img
                          src={faq.imageUrl}
                          alt={faq.question}
                          className="rounded-lg max-w-full h-auto object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* CTA Section */}
        {filteredFaqs.length > 0 && (
          <div className="mt-12 sm:mt-16 bg-black text-white rounded-lg p-6 sm:p-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Still have questions?</h2>
            <p className="text-gray-300 mb-6 sm:mb-8">
              Contact our support team and we'll help you right away.
            </p>
            <a
              href="mailto:support@101hub.com"
              className="inline-block bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Contact Support
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
