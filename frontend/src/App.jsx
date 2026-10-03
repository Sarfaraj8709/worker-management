import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import CreateTicket from './pages/CreateTicket';
import TicketDetails from './pages/TicketDetails';
import Messages from './pages/Messages';
import WorkerDocuments from './pages/WorkerDocuments';
import Landing from './pages/Landing';

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminWorkers = lazy(() => import('./pages/admin/Workers'));
const AdminWorkerNew = lazy(() => import('./pages/admin/WorkerNew'));
const AdminWorkerDetail = lazy(() => import('./pages/admin/WorkerDetail'));
const AdminVerification = lazy(() => import('./pages/admin/Verification'));
const AdminVerificationDetail = lazy(() => import('./pages/admin/VerificationDetail'));
const AdminServices = lazy(() => import('./pages/admin/Services'));
const AdminJobs = lazy(() => import('./pages/admin/Jobs'));
const AdminJobDetail = lazy(() => import('./pages/admin/JobDetail'));
const AdminPayments = lazy(() => import('./pages/admin/Payments'));
const AdminPaymentDetail = lazy(() => import('./pages/admin/PaymentDetail'));
const AdminReviews = lazy(() => import('./pages/admin/Reviews'));
const AdminComplaints = lazy(() => import('./pages/admin/Complaints'));
const AdminComplaintDetail = lazy(() => import('./pages/admin/ComplaintDetail'));
const AdminPromotions = lazy(() => import('./pages/admin/Promotions'));
const AdminPackages = lazy(() => import('./pages/admin/Packages'));
const AdminEmergency = lazy(() => import('./pages/admin/Emergency'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminNotifications = lazy(() => import('./pages/admin/Notifications'));
const AdminAuditLog = lazy(() => import('./pages/admin/AuditLog'));
const AdminProperties = lazy(() => import('./pages/admin/Properties'));

const withSuspense = (Component) => (
  <Suspense
    fallback={
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    }
  >
    <Component />
  </Suspense>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <ChatProvider>
          <ToastProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/verify-email/:token" element={<VerifyEmail />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <Messages />
                  </ProtectedRoute>
                }
              />
            <Route
              path="/tickets/new"
              element={
                <ProtectedRoute allowedRoles={['user']}>
                  <CreateTicket />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets/:id"
              element={
                <ProtectedRoute>
                  <TicketDetails />
                </ProtectedRoute>
              }
            />

            <Route
              path="/worker/verification"
              element={
                <ProtectedRoute allowedRoles={['worker']}>
                  <WorkerDocuments />
                </ProtectedRoute>
              }
            />

            <Route path="/admin" element={<AdminRoute allowedRoles={['admin', 'organization_admin']} />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={withSuspense(AdminDashboard)} />
              <Route path="users" element={withSuspense(AdminUsers)} />
              <Route path="workers" element={withSuspense(AdminWorkers)} />
              <Route path="workers/new" element={withSuspense(AdminWorkerNew)} />
              <Route path="workers/:id" element={withSuspense(AdminWorkerDetail)} />
              <Route path="verification" element={withSuspense(AdminVerification)} />
              <Route path="verification/:id" element={withSuspense(AdminVerificationDetail)} />
              <Route path="services" element={withSuspense(AdminServices)} />
              <Route path="jobs" element={withSuspense(AdminJobs)} />
              <Route path="jobs/:id" element={withSuspense(AdminJobDetail)} />
              <Route path="payments" element={withSuspense(AdminPayments)} />
              <Route path="payments/:id" element={withSuspense(AdminPaymentDetail)} />
              <Route path="reviews" element={withSuspense(AdminReviews)} />
              <Route path="complaints" element={withSuspense(AdminComplaints)} />
              <Route path="complaints/:id" element={withSuspense(AdminComplaintDetail)} />
              <Route path="promotions" element={withSuspense(AdminPromotions)} />
              <Route path="packages" element={withSuspense(AdminPackages)} />
              <Route path="emergency" element={withSuspense(AdminEmergency)} />
              <Route path="analytics" element={withSuspense(AdminAnalytics)} />
              <Route path="reports" element={withSuspense(AdminReports)} />
              <Route path="settings" element={withSuspense(AdminSettings)} />
              <Route path="notifications" element={withSuspense(AdminNotifications)} />
              <Route path="audit-log" element={withSuspense(AdminAuditLog)} />
              <Route path="properties" element={withSuspense(AdminProperties)} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </ChatProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
