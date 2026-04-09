import Link from "next/link";

type FeatureUnavailableProps = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export default function FeatureUnavailable({
  title,
  description,
  actionHref,
  actionLabel,
}: Readonly<FeatureUnavailableProps>) {
  return (
    <section className="panel p-6">
      <h1 className="text-2xl font-black text-[var(--brand-deep)]">{title}</h1>
      <p className="mt-2 text-[var(--ink-soft)]">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-deep)]"
        >
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}