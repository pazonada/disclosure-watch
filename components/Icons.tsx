import React from "react";

interface IconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

const defaultProps = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function FileText({ className = "h-5 w-5", size, strokeWidth = 1 }: IconProps) {
  return (
    <svg {...defaultProps} className={className} width={size} height={size} strokeWidth={strokeWidth}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

export function CalendarDays({ className = "h-5 w-5", size, strokeWidth = 1 }: IconProps) {
  return (
    <svg {...defaultProps} className={className} width={size} height={size} strokeWidth={strokeWidth}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
      <path d="M16 18h.01" />
    </svg>
  );
}

export function Newspaper({ className = "h-5 w-5", size, strokeWidth = 1 }: IconProps) {
  return (
    <svg {...defaultProps} className={className} width={size} height={size} strokeWidth={strokeWidth}>
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8" />
      <path d="M15 18h-5" />
      <path d="M10 6h8v4h-8V6Z" />
    </svg>
  );
}

export function MapPin({ className = "h-5 w-5", size, strokeWidth = 1 }: IconProps) {
  return (
    <svg {...defaultProps} className={className} width={size} height={size} strokeWidth={strokeWidth}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function AlertTriangle({ className = "h-5 w-5", size, strokeWidth = 1 }: IconProps) {
  return (
    <svg {...defaultProps} className={className} width={size} height={size} strokeWidth={strokeWidth}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function Clock({ className = "h-5 w-5", size, strokeWidth = 1 }: IconProps) {
  return (
    <svg {...defaultProps} className={className} width={size} height={size} strokeWidth={strokeWidth}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function Radio({ className = "h-5 w-5", size, strokeWidth = 1 }: IconProps) {
  return (
    <svg {...defaultProps} className={className} width={size} height={size} strokeWidth={strokeWidth}>
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
      <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
      <path d="M19.1 4.9c3.9 3.9 3.9 10.2 0 14.1" />
    </svg>
  );
}

export function Unlock({ className = "h-5 w-5", size, strokeWidth = 1 }: IconProps) {
  return (
    <svg {...defaultProps} className={className} width={size} height={size} strokeWidth={strokeWidth}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

export function Camera({ className = "h-5 w-5", size, strokeWidth = 1 }: IconProps) {
  return (
    <svg {...defaultProps} className={className} width={size} height={size} strokeWidth={strokeWidth}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

export function Video({ className = "h-5 w-5", size, strokeWidth = 1 }: IconProps) {
  return (
    <svg {...defaultProps} className={className} width={size} height={size} strokeWidth={strokeWidth}>
      <path d="m22 8-6 4 6 4V8Z" />
      <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
    </svg>
  );
}

export function ChevronLeft({ className = "h-5 w-5", size, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...defaultProps} className={className} width={size} height={size} strokeWidth={strokeWidth}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function ChevronRight({ className = "h-5 w-5", size, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...defaultProps} className={className} width={size} height={size} strokeWidth={strokeWidth}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

// Map document categories to icons
export function CategoryIcon({ category, className = "h-5 w-5", strokeWidth = 1 }: { category: string; className?: string; strokeWidth?: number }) {
  switch (category) {
    case "Report": return <FileText className={className} strokeWidth={strokeWidth} />;
    case "Hearing": return <CalendarDays className={className} strokeWidth={strokeWidth} />;
    case "FOIA Release": return <Unlock className={className} strokeWidth={strokeWidth} />;
    case "Executive Order": return <FileText className={className} strokeWidth={strokeWidth} />;
    case "Official Statement": return <Newspaper className={className} strokeWidth={strokeWidth} />;
    case "Press Release": return <Newspaper className={className} strokeWidth={strokeWidth} />;
    case "Video": return <Video className={className} strokeWidth={strokeWidth} />;
    case "Archive": return <Unlock className={className} strokeWidth={strokeWidth} />;
    default: return <FileText className={className} strokeWidth={strokeWidth} />;
  }
}
