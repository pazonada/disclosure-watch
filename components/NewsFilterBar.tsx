import { NewsType } from "@/lib/types";

export type NewsDateRange = "30d" | "1y" | "all";
export type NewsSortOption = "newest" | "oldest";

interface Props {
  source?: string;
  type?: NewsType;
  dateRange: NewsDateRange;
  sort: NewsSortOption;
  sources: string[];
  onSourceChange: (val: string | undefined) => void;
  onTypeChange: (val: NewsType | undefined) => void;
  onDateRangeChange: (val: NewsDateRange) => void;
  onSortChange: (val: NewsSortOption) => void;
}

const SELECT_CLASS =
  "rounded-lg border border-card-subtle bg-muted px-3 py-2 text-sm text-muted-foreground outline-none focus:border-lime";

export default function NewsFilterBar({
  source,
  type,
  dateRange,
  sort,
  sources,
  onSourceChange,
  onTypeChange,
  onDateRangeChange,
  onSortChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={source || ""}
        onChange={(e) => onSourceChange(e.target.value || undefined)}
        className={SELECT_CLASS}
      >
        <option value="">All Sources</option>
        {sources.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={type || ""}
        onChange={(e) =>
          onTypeChange((e.target.value || undefined) as NewsType | undefined)
        }
        className={SELECT_CLASS}
      >
        <option value="">All Types</option>
        <option value="article">Articles</option>
        <option value="video">Videos</option>
      </select>

      <select
        value={dateRange}
        onChange={(e) => onDateRangeChange(e.target.value as NewsDateRange)}
        className={SELECT_CLASS}
      >
        <option value="all">All Time</option>
        <option value="30d">Last 30 Days</option>
        <option value="1y">Last Year</option>
      </select>

      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as NewsSortOption)}
        className={SELECT_CLASS}
      >
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
      </select>
    </div>
  );
}
