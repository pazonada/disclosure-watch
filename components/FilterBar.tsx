import { DocumentCategory, DocumentSource, Importance } from "@/lib/types";
import { sourceLabel } from "@/lib/utils";

export type DateRange = "30d" | "1y" | "all";
export type SortOption = "newest" | "oldest" | "importance" | "recently-added";

interface Props {
  category?: DocumentCategory;
  importance?: Importance;
  source?: DocumentSource;
  dateRange: DateRange;
  sort: SortOption;
  onCategoryChange: (val: DocumentCategory | undefined) => void;
  onImportanceChange: (val: Importance | undefined) => void;
  onSourceChange: (val: DocumentSource | undefined) => void;
  onDateRangeChange: (val: DateRange) => void;
  onSortChange: (val: SortOption) => void;
}

const categories: DocumentCategory[] = ["Report", "Hearing", "FOIA Release", "Executive Order", "Official Statement", "Press Release", "Video", "Archive"];
const importances: Importance[] = ["High", "Medium", "Low"];
const sources: DocumentSource[] = ["AARO", "Archives", "Congress", "Department of Defense", "NASA", "White House", "The Black Vault", "The Debrief", "Manual"];

const SELECT_CLASS = "rounded-lg border border-card-subtle bg-muted px-3 py-2 text-sm text-muted-foreground outline-none focus:border-lime";

export default function FilterBar({
  category,
  importance,
  source,
  dateRange,
  sort,
  onCategoryChange,
  onImportanceChange,
  onSourceChange,
  onDateRangeChange,
  onSortChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={category || ""}
        onChange={(e) =>
          onCategoryChange((e.target.value || undefined) as DocumentCategory | undefined)
        }
        className={SELECT_CLASS}
      >
        <option value="">All Types</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <select
        value={importance || ""}
        onChange={(e) =>
          onImportanceChange((e.target.value || undefined) as Importance | undefined)
        }
        className={SELECT_CLASS}
      >
        <option value="">All Importance</option>
        {importances.map((i) => (
          <option key={i} value={i}>{i}</option>
        ))}
      </select>

      <select
        value={source || ""}
        onChange={(e) =>
          onSourceChange((e.target.value || undefined) as DocumentSource | undefined)
        }
        className={SELECT_CLASS}
      >
        <option value="">All Sources</option>
        {sources.map((s) => (
          <option key={s} value={s}>{sourceLabel(s)}</option>
        ))}
      </select>

      <select
        value={dateRange}
        onChange={(e) => onDateRangeChange(e.target.value as DateRange)}
        className={SELECT_CLASS}
      >
        <option value="all">All Time</option>
        <option value="30d">Last 30 Days</option>
        <option value="1y">Last Year</option>
      </select>

      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        className={SELECT_CLASS}
      >
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
        <option value="recently-added">Recently Added</option>
        <option value="importance">By Importance</option>
      </select>
    </div>
  );
}
