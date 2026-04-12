"use client";

import { useEffect, useState, useMemo } from "react";
import type { FAQ } from "@/lib/site-content-types";

export default function FAQsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
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
  
  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchCategory = !selectedCategory || faq.category === selectedCategory;
      const matchSearch = !searchTerm || 
        faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [faqs, selectedCategory, searchTerm]);

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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Find answers to common questions about our products, services, and policies. Browse by category or search for what you need.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 sm:mb-12">
          <div className="relative">
            <input
              type="text"
              placeholder="Search FAQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-gray-900 placeholder:text-gray-500 transition-colors"
            />
            <svg
              className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="mb-8 sm:mb-12">
            <p className="text-sm font-semibold text-gray-600 mb-3">Filter by Category:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full font-medium transition-all text-sm sm:text-base ${
                  selectedCategory === null
                    ? "bg-black text-white shadow-lg"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                All Categories
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full font-medium transition-all text-sm sm:text-base ${
                    selectedCategory === category
                      ? "bg-black text-white shadow-lg"
                      : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results Count */}
        {searchTerm && (
          <div className="mb-6 text-sm text-gray-600">
            Found {filteredFaqs.length} result{filteredFaqs.length !== 1 ? "s" : ""} for "{searchTerm}"
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
          <div className="mt-12 sm:mt-16 bg-gradient-to-r from-black to-gray-800 text-white rounded-2xl p-8 sm:p-10 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Didn't find your answer?</h2>
            <p className="text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto">
              We're here to help! Contact our support team anytime and we'll be happy to assist you with any questions or concerns.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:support@101hub.com"
                className="inline-flex items-center justify-center gap-2 bg-white text-black px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Support
              </a>
              <a
                href="/orders"
                className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-black transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m0 0V3a2 2 0 00-2-2h-2a2 2 0 00-2 2v2z" />
                </svg>
                Track Order
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
