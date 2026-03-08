import Link from "next/link";

interface Props {
  tag: string;
}

export default function TagPill({ tag }: Props) {
  return (
    <Link
      href={`/search?tag=${encodeURIComponent(tag)}`}
      className="inline-block rounded-full bg-[var(--muted-50)] px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all hover:bg-muted hover:text-lime"
    >
      {tag}
    </Link>
  );
}
