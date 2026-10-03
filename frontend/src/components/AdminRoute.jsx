import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminLayout from './admin/AdminLayout';

/**
 * Guards the /admin/* section. Only users whose role is in `allowedRoles`
 * may access admin routes — server-side authorization is enforced by the
 * backend `authorize` middleware as well.
 */
const AdminRoute = ({ allowedRoles = ['admin'] }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#010907]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AdminLayout />;
};

export default AdminRoute;
