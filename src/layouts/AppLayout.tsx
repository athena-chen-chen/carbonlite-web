//import { Outlet } from 'react-router-dom';
// import TopNav from '../components/TopNav';
// import '../styles.css';
// import '../index.css';
// export default function AppLayout() {
//   return (
//     <div className="app">
//       <header className="app-header">
       
//          <a href="/" className="brand-link" aria-label="CarbonLite Home">
//           <img src="/brand.svg" alt="CarbonLite" className="brand" />
//         </a>
//         <TopNav />
//       </header>
//       <main className="app-main">
//         <Outlet />
//       </main>
//     </div>
//   );
// }


// import React, { useEffect, useMemo, useState } from 'react';
// import { NavLink, Outlet, useLocation } from 'react-router-dom';
// import { useAuth } from '../auth/AuthProvider';

// // Define sidebar nav items
// const links = [
//   { to: '/', label: 'Dashboard', icon: '🏠', end: true },
//   { to: '/emissions', label: 'Emissions', icon: '🌿' },
//   { to: '/analysis', label: 'Analysis', icon: '📈' },
//   { to: '/reports', label: 'Reports', icon: '📄' },
//   { to: '/factors', label: 'Factors', icon: '🧪' },
//   { to: '/admin', label: 'Admin', icon: '⚙️' },
// ];

// export default function AppLayout() {
//   const { user, logout } = useAuth();
//   const loc = useLocation();

//   // Which page title to show in the top bar
//   const pageTitle = useMemo(() => {
//     // exact match first
//     const exact = links.find(l => l.to === loc.pathname);
//     if (exact) return exact.label;

//     // then try prefix match like "/factors/123"
//     const fuzzy = links.find(l => loc.pathname.startsWith(l.to) && l.to !== '/');
//     if (fuzzy) return fuzzy.label;

//     // fallback
//     return 'CarbonLite';
//   }, [loc.pathname]);

//   // Light / Dark mode sync
//   const [dark, setDark] = useState(() =>
//     document.documentElement.classList.contains('dark')
//   );

//   useEffect(() => {
//     document.documentElement.classList.toggle('dark', dark);
//   }, [dark]);

//   return (
//     <div className="app-shell">
//       {/* Sidebar */}
//       <aside className="sidebar">
//         <div className="sidebar-header">
//           CarbonLite
//         </div>

//         <nav className="sidebar-nav">
//           <div className="sidebar-item sidebar-item-active">
//             <span className="sidebar-icon">🏠</span>
//             <span>Dashboard</span>
//           </div>

//           <div className="sidebar-item">
//             <span className="sidebar-icon">📊</span>
//             <span>Emissions</span>
//           </div>

//           <div className="sidebar-item">
//             <span className="sidebar-icon">📁</span>
//             <span>Reports</span>
//           </div>
//         </nav>

//         <div className="sidebar-footer">
//           v0.1 • Internal
//         </div>
//       </aside>

//       {/* Main column */}
//       <div className="main-column">
//         {/* Top nav */}
//         <header className="top-nav">
//           <div className="top-nav-left">
//             <div className="min-w-0">
//               <div className="top-nav-title">Dashboard</div>
//               <div className="top-nav-subtitle">
//                 Company-wide emissions summary
//               </div>
//             </div>
//           </div>

//           <div className="top-nav-right">
//             <div className="avatar-chip">
//               <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-semibold">
//                 SC
//               </span>
//               <span>Athena Chen</span>
//             </div>
//           </div>
//         </header>

//         {/* Scrollable content */}
//         <main className="main-content">
//           <section className="card">
//             <div className="card-body">
//               <div className="card-row">
//                 <div className="page-title">Emissions Overview</div>
//                 <div className="page-hint">Last 12 months</div>
//               </div>

//               {/* your actual dashboard widgets here */}
//               <div className="stat-card">
//                 <div className="stat-value">42,310 tCO₂e</div>
//                 <div className="stat-label">Total Scope 1 + 2</div>
//               </div>
//             </div>
//           </section>
//         </main>
//       </div>
//     </div>
//   );


  // return (
  //   <div className="shell">
  //     {/* Sidebar */}
  //     <aside className="sidebar flex flex-col">
  //       {/* Brand / Logo area */}
  //       <div>
  //         <div className="side-title flex items-center gap-2">
  //           {/* Lockup style logo: leaf + text */}
  //           <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-sm font-semibold">
  //             CL
  //           </div>
  //           <span>CarbonLite</span>
  //         </div>
  //         <div className="side-meta">
  //           Track · Analyze · Report
  //         </div>
  //       </div>

  //       {/* Navigation */}
  //       <nav className="nav flex-1 pt-4">
  //         {links.map(l => (
  //           <NavLink
  //             key={l.to}
  //             to={l.to}
  //             end={l.end}
  //             className={({ isActive }) =>
  //               'nav-link' + (isActive ? ' active' : '')
  //             }
  //           >
  //             <span className="text-base leading-none">{l.icon}</span>
  //             <span className="truncate">{l.label}</span>
  //           </NavLink>
  //         ))}
  //       </nav>

  //       {/* Footer section in sidebar (user info mini card) */}
  //       <div className="mt-6 border-t border-[rgb(var(--border))] pt-4 text-xs text-[rgb(var(--muted))]">
  //         {user ? (
  //           <div className="space-y-1">
  //             <div className="font-medium text-[rgb(var(--text))] text-sm truncate">
  //               {user.name ?? user.email}
  //             </div>
  //             <div className="flex items-center justify-between">
  //               <div className="truncate">
  //                 {user.role ?? 'user'}
  //               </div>
  //               <button
  //                 className="btn btn-ghost px-2 py-1 text-xs"
  //                 onClick={logout}
  //               >
  //                 Logout
  //               </button>
  //             </div>
  //           </div>
  //         ) : (
  //           <div className="italic text-[rgb(var(--muted))]">
  //             Not signed in
  //           </div>
  //         )}

  //         <div className="text-[10px] text-[rgb(var(--muted))] mt-3">
  //           v0.1 preview
  //         </div>
  //       </div>
  //     </aside>

  //     {/* Main column */}
  //     <main className="flex flex-col min-w-0">
  //       {/* Top bar */}
  //       <header className="topbar">
  //         <div className="topwrap">
  //           {/* Left: page title */}
  //           <div className="font-medium truncate">
  //             {pageTitle}
  //           </div>

  //           {/* Right: actions */}
  //           <div className="flex items-center gap-2">
  //             {/* Light/Dark toggle */}
  //             <button
  //               className="btn btn-ghost text-xs"
  //               onClick={() => setDark(d => !d)}
  //               title="Toggle dark mode"
  //             >
  //               <span className="hidden sm:inline">
  //                 {dark ? '🌙 Dark' : '☀️ Light'}
  //               </span>
  //               <span className="sm:hidden">
  //                 {dark ? '🌙' : '☀️'}
  //               </span>
  //             </button>

  //             {/* User summary pill (desktop) */}
  //             {user && (
  //               <div className="hidden sm:flex items-center gap-3 text-left">
  //                 <div className="text-xs leading-tight">
  //                   <div className="text-[rgb(var(--text))] font-medium">
  //                     {user.name ?? user.email}
  //                   </div>
  //                   <div className="text-[rgb(var(--muted))]">
  //                     {user.role ?? 'user'}
  //                   </div>
  //                 </div>
  //                 <button
  //                   className="btn btn-outline text-xs py-1"
  //                   onClick={logout}
  //                 >
  //                   Logout
  //                 </button>
  //               </div>
  //             )}
  //           </div>
  //         </div>
  //       </header>

  //       {/* Page content wrapper */}
  //       <div className="section">
  //         <div className="card">
  //           <div className="card-body">
  //             {/* child route content gets rendered here */}
  //             <Outlet />
  //           </div>
  //         </div>
  //       </div>
  //     </main>
  //   </div>
  // );
//}
// src/layout/AppLayout.tsx
import { Outlet, useMatches } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { TopNav } from "../components/TopNav";

/**
 * We want TopNav's title/subtitle to change per route.
 * We'll read route handle data (defined in the route config below).
 */
export default function AppLayout() {
  // useMatches() gives us all matched routes, deepest last
  const matches = useMatches();
  const active = matches[matches.length - 1];

  // We’ll read `handle` from the route definition.
  const pageTitle = active?.handle?.title ?? "";
  const pageSubtitle = active?.handle?.subtitle ?? "";

  return (
    <div className="app-shell">
      {/* Left sidebar */}
      <Sidebar />

      {/* Right column */}
      <div className="main-column">
        <TopNav title={pageTitle} subtitle={pageSubtitle} />

        {/* Page body */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
