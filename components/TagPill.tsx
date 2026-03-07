import Link from "next/link";

interface Props {
  tag: string;
}

export default function TagPill({ tag }: Props) {
  return (
    <Link
      href={`/search?tag=${encodeURIComponent(tag)}`}
      className="inline-block rounded-full bg-slate-700/50 px-2.5 py-1 text-xs font-medium text-slate-300 transition-all hover:bg-slate-700/80 hover:text-accent-cyan"
    >
      {tag}
    </Link>
  );
}
