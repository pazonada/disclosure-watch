import { DocumentCategory, Importance } from "@/lib/types";

interface Props {
  category?: DocumentCategory;
  importance?: Importance;
  onCategoryChange: (val: DocumentCategory | undefined) => void;
  onImportanceChange: (val: Importance | undefined) => void;
}

const categories: DocumentCategory[] = ["Report", "Hearing", "FOIA Release", "Image", "News"];
const importances: Importance[] = ["High", "Medium", "Low"];

export default function FilterBar({
  category,
  importance,
  onCategoryChange,
  onImportanceChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={category || ""}
        onChange={(e) =>
          onCategoryChange((e.target.value || undefined) as DocumentCategory | undefined)
        }
        className="rounded-lg border border-card-subtle bg-muted px-3 py-2 text-sm text-muted-foreground outline-none focus:border-lime"
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
        className="rounded-lg border border-card-subtle bg-muted px-3 py-2 text-sm text-muted-foreground outline-none focus:border-lime"
      >
        <option value="">All Importance</option>
        {importances.map((i) => (
          <option key={i} value={i}>{i}</option>
        ))}
      </select>
    </div>
  );
}
