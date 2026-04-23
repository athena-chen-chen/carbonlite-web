// import { NavLink } from 'react-router-dom';

// const linkCls = ({ isActive }: { isActive: boolean }) =>
//   `nav-link${isActive ? ' active' : ''}`;

// export default function TopNav() {
//   return (
//     <nav className="nav">
//       <NavLink to="/" end className={linkCls}>Dashboard</NavLink>
//       <NavLink to="/emissions" className={linkCls}>Emissions</NavLink>
//       <NavLink to="/analysis" className={linkCls}>Analysis</NavLink>
//       <NavLink to="/reports" className={linkCls}>Reports</NavLink>
//       <NavLink to="/factors" className={linkCls}>Factors</NavLink>
//       <NavLink to="/admin" className={linkCls}>Admin</NavLink>
//     </nav>
//   );
// }

// src/components/TopNav.tsx

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
