import Link from "next/link";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  href?: string;
  cta?: string;
};

export function SectionHeader({ eyebrow, title, href, cta }: SectionHeaderProps) {
  const titleParts = title.split("Leeds United");

  return (
    <div className="mb-7 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#ffdd00]/85">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {titleParts.length > 1 ? (
            <>
              {titleParts[0]}
              <span className="text-[#ffde59]">Leeds United</span>
              {titleParts.slice(1).join("Leeds United")}
            </>
          ) : (
            title
          )}
        </h2>
      </div>
      {href && cta ? (
        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href={href}
            className="group inline-flex shrink-0 items-center gap-2 border-b border-white/15 pb-1 text-xs font-bold uppercase tracking-[0.14em] text-zinc-400 transition hover:border-[#ffdd00] hover:text-[#ffdd00]"
          >
            {cta}
            <span className="text-base leading-none">→</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
