import React, { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import Button from '../../components/admin/Button';
import { Input } from '../../components/admin/Input';
import { PageSkeleton } from '../../components/admin/Skeleton';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import { getReports, exportReport, isMissingEndpoint, getErrorMessage } from '../../services/admin';
import useAsync from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { formatNumber } from '../../utils/format';

const Reports = () => {
  const { toast } = useToast();
  const state = useAsync(getReports);
  const { data: reports, loading, error, reload } = state;
  const [filters, setFilters] = useState({ from: '', to: '', status: '', location: '' });
  const [exporting, setExporting] = useState(null);

  const download = async (report, format) => {
    if (format === 'pdf') {
      toast.error('PDF export requires GET /api/admin/reports/export?format=pdf on the backend.');
      return;
    }
    setExporting(report.id || report);
    try {
      const blob = await exportReport(report.id || report, filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.id || report}-report.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setExporting(null);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Generate operational reports from live platform data." />
      {error ? (
        isMissingEndpoint(error) ? <EndpointRequired error={error} /> : <ErrorState message={getErrorMessage(error)} onRetry={reload} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input label="From" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            <Input label="To" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
            <Input label="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} placeholder="Optional" />
            <Input label="Location / pincode" value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} placeholder="Optional" />
          </div>
          {!reports?.length ? (
            <EmptyState icon={FileText} title="No reports available" />
          ) : (
            <div className="divide-y divide-slate-800 overflow-hidden rounded-2xl border border-slate-800">
              {reports.map((r) => (
                <div key={r.id || r.name} className="flex flex-col gap-3 bg-slate-900/40 p-4 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <p className="font-semibold text-white">{r.name || r}</p>
                    {r.count !== undefined && <p className="text-xs text-slate-500">{formatNumber(r.count)} records</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" loading={exporting === (r.id || r)} onClick={() => download(r, 'csv')}>
                      <Download className="h-4 w-4" /> Export CSV
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => download(r, 'pdf')}>Export PDF</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
