
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ActivityDataPage } from '../pages/ActivityDataPage';
import { ConversionFactorsPage } from '../pages/ConversionFactorsPage';
import { MetricsSummaryPage } from '../pages/MetricsSummaryPage';
import { UploadPage } from '../pages/UploadPage';
import { AppNav } from '../components/AppNav';
import { FeedbackWidget } from '../components/FeedbackWidget';
import { SentryRouteContext } from '../components/SentryRouteContext';
import { SentryTestErrorButton } from '../components/SentryTestErrorButton';
import ReportingPage from '../pages/ReportingPage';
import CarbonLiteLandingPage from '../pages/LandingPage';
import NotFound from '../pages/NotFound';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import PilotPage from '../pages/PilotPage';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { FeedbackManagementPage } from '../pages/FeedbackManagementPage';
import { AuditLogPage } from '../pages/AuditLogPage';
import { UserActivityPage } from '../pages/UserActivityPage';
import { AdminRoute } from '../auth/AdminRoute';
import { AnalyticsRouteTracker } from '../components/AnalyticsRouteTracker';

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      <AppNav />
      <main style={{ padding: '24px 0' }}>{children}</main>
      <FeedbackWidget />
      <SentryTestErrorButton />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SentryRouteContext />
      <AnalyticsRouteTracker />
      <Routes>
        <Route path="/" element={<CarbonLiteLandingPage />} />
        <Route path="/pilot" element={<PilotPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/data-records"
          element={
            <ProtectedRoute>
              <AppShell>
                <ActivityDataPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/activity-data"
          element={
            <ProtectedRoute>
              <AppShell>
                <ActivityDataPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/conversion-factors"
          element={
            <ProtectedRoute>
              <AppShell>
                <ConversionFactorsPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/metrics-summary"
          element={
            <ProtectedRoute>
              <AppShell>
                <MetricsSummaryPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <AppShell>
                <UploadPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
      
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <AppShell>
                <ReportingPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/feedback"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <AppShell>
                  <FeedbackManagementPage />
                </AppShell>
              </AdminRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/audit-log"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <AppShell>
                  <AuditLogPage />
                </AppShell>
              </AdminRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/activity"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <AppShell>
                  <UserActivityPage />
                </AppShell>
              </AdminRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/user-activity"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <AppShell>
                  <UserActivityPage />
                </AppShell>
              </AdminRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reporting"
          element={
            <ProtectedRoute>
              <AppShell>
                <ReportingPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            <AppShell>
              <NotFound />
            </AppShell>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
