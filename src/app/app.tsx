// import { createBrowserRouter, RouterProvider } from 'react-router-dom';
// import { Routes, Route } from 'react-router-dom';

// import { AuthProvider } from '../auth/AuthProvider';
// import { AppShell } from "../layouts/AppShell";
// import AppLayout from '../layouts/AppLayout';
// import Dashboard from '../pages/Dashboard';
// import Emissions from '../pages/Emissions';
// import Analysis from '../pages/Analysis';
// import Reports from '../pages/Reports';
// import Factors from '../pages/Factors';
// import Admin from '../pages/Admin';
// import NotFound from '../pages/NotFound';
// import Login from '../pages/Login';

// export const router = createBrowserRouter([
//   // Public route(s)
//   {
//     path: "/login",
//     element: <Login />,
//   },

//   // Protected area
//   {
//     path: "/",
//     element: (
//       // <RequireAuth>
//       <AppLayout />
//       // </RequireAuth>
//     ),
//     children: [
//       {
//         index: true,
//         element: <Dashboard />,
//         handle: {
//           title: "Dashboard",
//           subtitle: "Company-wide emissions summary",
//         },
//       },
//       {
//         path: "emissions",
//         element: <Emissions />,
//         handle: {
//           title: "Emissions",
//           subtitle: "All recorded sources",
//         },
//       },
//       {
//         path: "analysis",
//         element: <Analysis />,
//         handle: {
//           title: "Analysis",
//           subtitle: "Trends and breakdowns",
//         },
//       },
//       {
//         path: "reports",
//         element: <Reports />,
//         handle: {
//           title: "Reports",
//           subtitle: "Compliance & exports",
//         },
//       },
//       {
//         path: "factors",
//         element: <Factors />,
//         handle: {
//           title: "Factors",
//           subtitle: "Emission factors & references",
//         },
//       },
//       {
//         path: "admin",
//         element: <Admin />,
//         handle: {
//           title: "Admin",
//           subtitle: "Org settings & access",
//         },
//       },
//         {
//         path: "metrics",
//         element: <MetricsSummaryPage />,
//         handle: {
//           title: "Metrics Summary",
//           subtitle: "Metrics Summary",
//         },
//       },
//       {
//         path: "*",
//         element: <NotFound />,
//         handle: {
//           title: "Not found",
//           subtitle: "",
//         },
//       },
//     ],
//   },

//   // fallback for anything totally unmatched
//   {
//     path: "*",
//     element: <NotFound />,
//   },
// ]);



// export default function App() {
//   return <RouterProvider router={router} />;
// }
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ActivityDataPage } from '../pages/ActivityDataPage';
import { ConversionFactorsPage } from '../pages/ConversionFactorsPage';
import { MetricsSummaryPage } from '../pages/MetricsSummaryPage';
import { UploadPage } from '../pages/UploadPage';
import { AppNav } from '../components/AppNav';

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', background: '#fafafa' }}>
        <AppNav />

        <main style={{ padding: '24px 0' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/metrics-summary" replace />} />
            <Route path="/activity-data" element={<ActivityDataPage />} />
            <Route path="/conversion-factors" element={<ConversionFactorsPage />} />
            <Route path="/metrics-summary" element={<MetricsSummaryPage />} />
            <Route path="/upload" element={<UploadPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}