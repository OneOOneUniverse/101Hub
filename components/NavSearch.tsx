"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { sanitizeSearchQuery } from "@/lib/validation";

export default function NavSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = sanitizeSearchQuery(query);

    if (!term) {
      router.push("/products");
      return;
    }

    router.push(`/products?q=${encodeURIComponent(term)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <label htmlFor="nav-search" className="sr-only">
        Search products
      </label>
      <div className="relative flex w-full items-center">
        <svg
          className="pointer-events-none absolute left-3.5 h-4 w-4 text-[var(--brand)]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          id="nav-search"
          value={query}
          onChange={(event) => setQuery(event.target.value.slice(0, 100))}
          placeholder="Search gadgets, brands, and accessories"
          className="w-full rounded-full border-2 border-[rgba(255,107,53,0.2)] bg-white py-2 pl-9 pr-24 text-sm text-[#172026] outline-none transition-all placeholder:font-semibold placeholder:text-[rgba(255,107,53,0.45)] focus:border-[var(--brand)] focus:shadow-[0_0_0_3px_rgba(255,107,53,0.1)]"
        />
        <button
          type="submit"
          className="absolute right-1.5 rounded-full bg-[var(--brand)] px-4 py-1.5 text-xs font-bold text-white transition-all hover:bg-[var(--brand-deep)] hover:shadow-md active:scale-95"
        >
          Search
        </button>
      </div>
    </form>
  );
}
