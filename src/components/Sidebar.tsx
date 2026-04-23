// src/components/Sidebar.tsx
import { NavLink } from "react-router-dom";

const links = [
  { to: '/', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/emissions', label: 'Emissions', icon: '🌿' },
  { to: '/analysis', label: 'Analysis', icon: '📈' },
  { to: '/reports', label: 'Reports', icon: '📄' },
  { to: '/factors', label: 'Factors', icon: '🧪' },
  { to: '/admin', label: 'Admin', icon: '⚙️' },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      {/* header / logo */}
      <div className="sidebar-header">
       <img src="/brand.svg" alt="CarbonLite" className="brand" />
      </div>

      {/* nav list */}
      <nav className="sidebar-nav">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              [
                "sidebar-item",
                isActive ? "sidebar-item-active" : "",
              ].join(" ")
            }
          >
            <span className="sidebar-icon">{link.icon}</span>
            <span className="truncate">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* footer */}
      <div className="sidebar-footer">
        v0.1 • Internal
      </div>
    </aside>
  );
}
