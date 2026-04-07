import { cn } from "./ui/utils";
import logo from "./logo.png";

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
};

export function BrandLogo({ compact = false, className }: BrandLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      {/* <svg
        viewBox="0 0 48 48"
        width={compact ? 32 : 36}
        height={compact ? 32 : 36}
        aria-hidden
        className="shrink-0 drop-shadow-[0_3px_8px_rgba(37,99,235,0.35)]"
      >
        <defs>
          <linearGradient id="lc_bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="55%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#4338CA" />
          </linearGradient>
          <linearGradient id="lc_ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="100%" stopColor="#C4B5FD" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="42" height="42" rx="12" fill="url(#lc_bg)" />
        <rect
          x="4.25"
          y="4.25"
          width="39.5"
          height="39.5"
          rx="11"
          fill="none"
          stroke="url(#lc_ring)"
          strokeWidth="1.5"
          opacity="0.9"
        />
        <path
          d="M13 17.5c0-1.1.9-2 2-2h8.2c2.8 0 5 2.2 5 5v13h-9.1c-3.4 0-6.1-2.7-6.1-6.1V17.5z"
          fill="#EFF6FF"
        />
        <path
          d="M35 17.5c0-1.1-.9-2-2-2h-8.2c-2.8 0-5 2.2-5 5v13h9.1c3.4 0 6.1-2.7 6.1-6.1V17.5z"
          fill="#DBEAFE"
        />
        <path
          d="M24 19v14.5"
          stroke="#1E3A8A"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
        />
        <circle cx="24" cy="12.3" r="2.1" fill="#F8FAFC" />
      </svg> */}
      <img
        src={logo}
        alt="Life Computer Course Hub Logo"
        width={compact ? 32 : 36}
        height={compact ? 32 : 36}
        className="shrink-0 drop-shadow-[0_3px_8px_rgba(37,99,235,0.35)]"
      />

      {!compact && (
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight text-slate-900">
            Life computer
          </div>
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-red-700/90">
            Course Hub
          </div>
        </div>
      )}
    </div>
  );
}
