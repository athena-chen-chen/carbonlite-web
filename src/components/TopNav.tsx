

type TopNavProps = {
  title: string;
  subtitle?: string;
};

export function TopNav({ title, subtitle }: TopNavProps) {
  return (
    <header className="top-nav">
      <div className="top-nav-left">
        <div className="min-w-0">
          <div className="top-nav-title">{title}</div>
          {subtitle && (
            <div className="top-nav-subtitle">{subtitle}</div>
          )}
        </div>
      </div>

      <div className="top-nav-right">
        <div className="avatar-chip">
          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-semibold">
            SC
          </span>
          <span className="truncate">Athena Chen</span>
        </div>
      </div>
    </header>
  );
}
