import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ClientDashboard from '../components/ClientDashboard';
import WorkerDashboard from '../components/WorkerDashboard';
import Navbar from '../components/Navbar';

const Dashboard = () => {
  const { user } = useAuth();

  if (user?.role === 'admin' || user?.role === 'organization_admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const renderDashboardByRole = () => {
    switch (user?.role) {
      case 'user':
        return <ClientDashboard />;
      case 'worker':
        return <WorkerDashboard />;
      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-lg font-bold text-rose-400">Error: Invalid Role</h2>
            <p className="text-slate-400 mt-1">Please contact system administrator.</p>
          </div>
        );
    }
  };

  const wrapperClass = user?.role === 'user' ? 'min-h-screen bg-[#010907] text-slate-100' : 'min-h-screen bg-slate-950 text-slate-100';

  return (
    <div className={`${wrapperClass} flex flex-col`}>
      <Navbar />
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        {renderDashboardByRole()}
      </main>
    </div>
  );
};

export default Dashboard;
