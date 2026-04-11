"use client";

import Link from "next/link";
import type { Category } from "@/lib/site-content-types";

interface CategoryGridProps {
  categories: Category[];
  onSelectCategory?: (categoryName: string) => void;
}

export default function CategoryGrid({ categories, onSelectCategory }: CategoryGridProps) {
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <section className="panel p-4 sm:p-6 md:p-8">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-black sm:text-2xl">Browse by Category</h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Explore our product categories and find what you're looking for.
          </p>
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onSelectCategory?.(category.name)}
              className="group rounded-2xl border border-black/10 bg-white p-4 text-left shadow-sm transition hover:shadow-md hover:border-[var(--brand)]/40"
            >
              <h3 className="font-bold text-[var(--brand-deep)] group-hover:text-[var(--brand)] transition text-sm sm:text-base">
                {category.name}
              </h3>
              {category.description && (
                <p className="mt-1 text-xs text-[var(--ink-soft)] line-clamp-2">
                  {category.description}
                </p>
              )}
              {category.features && category.features.length > 0 && (
                <div className="mt-2 space-y-1">
                  {category.features.slice(0, 2).map((feature) => (
                    <p key={feature.id} className="text-xs text-[var(--ink-soft)]">
                      • {feature.name}
                    </p>
                  ))}
                  {category.features.length > 2 && (
                    <p className="text-xs text-[var(--ink-soft)]">
                      +{category.features.length - 2} more
                    </p>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
