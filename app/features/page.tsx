import Link from "next/link";

// ── SVG icons ─────────────────────────────────────────────────────────────────
function ShoppingBagIcon() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>;
}
function ZapIcon() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
}
function GavelIcon() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 4l5 5-9.5 9.5-5-5z"/><line x1="3" y1="21" x2="9.5" y2="14.5"/></svg>;
}
function GamepadIcon() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect x="2" y="6" width="20" height="12" rx="2"/></svg>;
}
function WrenchIcon() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>;
}
function TagIcon() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
}
function CartIcon() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.99-1.61L23 6H6"/></svg>;
}
function CreditCardIcon() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
}
function PackageIcon() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
}
function HeartIcon() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>;
}
function UserIcon() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function GiftIcon() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>;
}
function StarIcon() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
}
function HelpCircleIcon() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}

type Feature = {
  href: string;
  icon: React.ReactNode;
  gradient: string;
  title: string;
  description: string;
  badge?: string;
  badgeColor?: string;
};

const FEATURES: Feature[] = [
  {
    href: "/products",
    icon: <ShoppingBagIcon />,
    gradient: "from-orange-400 to-rose-500",
    title: "Shop Products",
    description:
      "Browse hundreds of gadgets, fashion items, home essentials, beauty products and more — all in one place.",
    badge: "Popular",
    badgeColor: "bg-orange-100 text-orange-700",
  },
  {
    href: "/flash-sale",
    icon: <ZapIcon />,
    gradient: "from-yellow-400 to-orange-500",
    title: "Flash Sale",
    description:
      "Time-limited deals that disappear when the clock hits zero. Massive discounts on top items every day.",
    badge: "Hot",
    badgeColor: "bg-yellow-100 text-yellow-700",
  },
  {
    href: "/auctions",
    icon: <GavelIcon />,
    gradient: "from-[var(--brand)] to-[var(--brand-deep)]",
    title: "Live Auctions",
    description:
      "Place bids on exclusive items in real-time. The highest bidder wins when the timer runs out.",
    badge: "New",
    badgeColor: "bg-orange-100 text-[var(--brand-deep)]",
  },
  {
    href: "/deals",
    icon: <GamepadIcon />,
    gradient: "from-emerald-400 to-teal-600",
    title: "Deals Hub",
    description:
      "Spin the wheel, scratch cards, trivia games, and memory matches — win real discounts and rewards.",
    badge: "Fun",
    badgeColor: "bg-emerald-100 text-emerald-700",
  },
  {
    href: "/services",
    icon: <WrenchIcon />,
    gradient: "from-blue-400 to-cyan-600",
    title: "Pro Services",
    description:
      "Book professional tech installations, device setup, repairs, and maintenance — done by experts.",
  },
  {
    href: "/black-friday",
    icon: <TagIcon />,
    gradient: "from-gray-800 to-gray-950",
    title: "Black Friday",
    description:
      "The biggest sale event of the year. Exclusive bundles, deep discounts, and limited stock items.",
    badge: "Seasonal",
    badgeColor: "bg-gray-100 text-gray-800",
  },
  {
    href: "/cart",
    icon: <CartIcon />,
    gradient: "from-sky-400 to-blue-500",
    title: "Smart Cart",
    description:
      "Add items, apply discount codes, see loyalty rewards, and track your total before checkout.",
  },
  {
    href: "/checkout",
    icon: <CreditCardIcon />,
    gradient: "from-green-400 to-emerald-600",
    title: "Checkout",
    description:
      "Secure checkout with MoMo, bank transfer, and more. Auto-save form, payment proof upload, and GPS delivery.",
  },
  {
    href: "/orders",
    icon: <PackageIcon />,
    gradient: "from-amber-400 to-orange-500",
    title: "Order Tracking",
    description:
      "Track every order in real-time — from payment review to out-for-delivery and confirmed delivery.",
  },
  {
    href: "/wishlist",
    icon: <HeartIcon />,
    gradient: "from-pink-400 to-rose-500",
    title: "Wishlist",
    description:
      "Save products you love for later, share your wishlist with friends, or revisit items you're considering.",
  },
  {
    href: "/profile",
    icon: <UserIcon />,
    gradient: "from-[var(--brand)] to-[var(--brand-deep)]",
    title: "My Profile",
    description:
      "Manage your account, set a custom avatar, update preferences, and view your order history.",
  },
  {
    href: "/referral",
    icon: <GiftIcon />,
    gradient: "from-fuchsia-400 to-pink-600",
    title: "Referral Program",
    description:
      "Invite friends and earn rewards. Unlock discount tiers and free shipping as you refer more people.",
    badge: "Earn",
    badgeColor: "bg-fuchsia-100 text-fuchsia-700",
  },
  {
    href: "/reviews",
    icon: <StarIcon />,
    gradient: "from-yellow-300 to-amber-500",
    title: "Reviews",
    description:
      "Read genuine customer reviews and ratings. Leave your own to help the community make better choices.",
  },
  {
    href: "/faqs",
    icon: <HelpCircleIcon />,
    gradient: "from-lime-400 to-green-600",
    title: "FAQs",
    description:
      "Answers to everything — delivery, payments, returns, product questions, and how things work.",
  },
];

export default function FeaturesPage() {
  return (
    <main className="mx-auto max-w-6xl px-3 py-10 sm:px-4 sm:py-14 space-y-14">
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl bg-[var(--ink)] px-6 py-14 text-center sm:px-10 sm:py-20">
        {/* decorative orbs */}
        <span className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-[var(--brand)] opacity-20 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-[var(--brand-deep)] opacity-15 blur-3xl" />

        <div className="relative z-10 space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white/80 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)] animate-pulse" />
            Everything in one place
          </span>
          <h1 className="text-3xl font-black text-white sm:text-5xl md:text-6xl leading-tight">
            Explore All<br />
            <span className="bg-gradient-to-r from-[var(--brand)] to-yellow-400 bg-clip-text text-transparent">
              Features
            </span>
          </h1>
          <p className="mx-auto max-w-xl text-sm text-white/60 sm:text-base">
            From shopping to live auctions, games to professional services — discover every
            feature 101 Hub has to offer.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href="/products"
              className="rounded-full bg-[var(--brand)] px-6 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-deep)] transition-all active:scale-95 shadow-lg"
            >
              Start Shopping
            </Link>
            <Link
              href="/auctions"
              className="rounded-full border border-white/30 bg-white/10 px-6 py-2.5 text-sm font-bold text-white hover:bg-white/20 backdrop-blur-sm transition-all active:scale-95"
            >
              View Auctions
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { value: "14+", label: "Features" },
          { value: "500+", label: "Products" },
          { value: "24/7", label: "Support" },
          { value: "Fast", label: "Delivery" },
        ].map(({ value, label }) => (
          <div
            key={label}
            className="panel flex flex-col items-center justify-center gap-1 py-5 text-center"
          >
            <span className="text-2xl font-black text-[var(--brand)] sm:text-3xl">{value}</span>
            <span className="text-xs font-semibold text-[var(--ink-soft)]">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Feature grid ───────────────────────────────────────────── */}
      <section>
        <div className="mb-6 flex items-center gap-3">
          <div className="h-1 flex-1 rounded-full bg-gradient-to-r from-[var(--brand)] to-transparent" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--ink-soft)]">
            All Features
          </h2>
          <div className="h-1 flex-1 rounded-full bg-gradient-to-l from-[var(--brand)] to-transparent" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feat) => (
            <Link
              key={feat.href}
              href={feat.href}
              className="group panel relative flex flex-col gap-4 overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-12px_rgba(255,107,53,0.18)] hover:border-[var(--brand)]/20"
            >
              {/* gradient stripe at top */}
              <span
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${feat.gradient} opacity-80 transition-all duration-300 group-hover:h-1.5`}
              />

              <div className="flex items-start justify-between gap-3">
                {/* icon orb */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${feat.gradient} text-white shadow-md`}
                >
                  {feat.icon}
                </div>

                {feat.badge && (
                  <span
                    className={`mt-0.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${feat.badgeColor ?? "bg-gray-100 text-gray-700"}`}
                  >
                    {feat.badge}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-black text-[var(--ink)] group-hover:text-[var(--brand)] transition-colors">
                  {feat.title}
                </h3>
                <p className="text-xs leading-relaxed text-[var(--ink-soft)]">
                  {feat.description}
                </p>
              </div>

              {/* arrow */}
              <div className="mt-auto flex items-center gap-1.5 text-xs font-bold text-[var(--brand)] opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-1">
                Explore
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ─────────────────────────────────────────────── */}
      <section className="panel overflow-hidden relative p-8 text-center sm:p-12">
        <span className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-[var(--brand)] opacity-10 blur-2xl" />
        <p className="relative text-xs font-bold uppercase tracking-widest text-[var(--brand)]">
          Ready to start?
        </p>
        <h2 className="relative mt-2 text-2xl font-black text-[var(--ink)] sm:text-3xl">
          Shop, bid, play & save — all in one app.
        </h2>
        <p className="relative mt-2 text-sm text-[var(--ink-soft)]">
          Join thousands of happy customers across Ghana.
        </p>
        <div className="relative mt-5 flex flex-wrap justify-center gap-3">
          <Link
            href="/products"
            className="rounded-full bg-[var(--brand)] px-7 py-3 text-sm font-bold text-white hover:bg-[var(--brand-deep)] transition-all active:scale-95 shadow-md"
          >
            Shop Now
          </Link>
          <Link
            href="/auctions"
            className="rounded-full border-2 border-[var(--brand)] px-7 py-3 text-sm font-bold text-[var(--brand)] hover:bg-[var(--brand)]/5 transition-all active:scale-95"
          >
            View Auctions
          </Link>
        </div>
      </section>
    </main>
  );
}
