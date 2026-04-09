"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function NavSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();

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
      <div className="flex w-full items-center gap-2 rounded-full border border-black/15 bg-white px-3 py-2 shadow-sm">
        <input
          id="nav-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search gadgets, brands, and accessories"
          className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--ink-soft)]/70"
        />
        <button
          type="submit"
          className="rounded-full bg-[var(--brand)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--brand-deep)]"
        >
          Search
        </button>
      </div>
    </form>
  );
}
