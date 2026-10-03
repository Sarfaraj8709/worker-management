import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/admin/PageHeader';
import Button from '../../components/admin/Button';
import { Input, Select } from '../../components/admin/Input';
import Toggle from '../../components/admin/Toggle';
import { ConfirmDialog } from '../../components/admin/Modal';
import { PageSkeleton } from '../../components/admin/Skeleton';
import ErrorState from '../../components/admin/ErrorState';
import EndpointRequired from '../../components/admin/EndpointRequired';
import { getSettings, updateSettings, isMissingEndpoint, getErrorMessage } from '../../services/admin';
import { useToast } from '../../context/ToastContext';

const Settings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setSettings(await getSettings());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const patch = (section, key, value) => {
    setSettings((s) => ({ ...s, [section]: { ...s[section], [key]: value } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateSettings(settings);
      setSettings(updated);
      setConfirm(false);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSkeleton />;
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" />
        {isMissingEndpoint(error) ? <EndpointRequired error={error} /> : <ErrorState message={getErrorMessage(error)} onRetry={load} />}
      </div>
    );
  }

  const g = settings.general || {};
  const jobs = settings.jobs || {};
  const workers = settings.workers || {};
  const notes = settings.notifications || {};
  const security = settings.security || {};

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Platform configuration. Changes apply after save." actions={<Button onClick={() => setConfirm(true)}>Save changes</Button>} />

      <Section title="General">
        <Input label="Platform name" value={g.platformName || ''} onChange={(e) => patch('general', 'platformName', e.target.value)} />
        <Input label="Support email" type="email" value={g.supportEmail || ''} onChange={(e) => patch('general', 'supportEmail', e.target.value)} />
        <Input label="Support phone" value={g.supportPhone || ''} onChange={(e) => patch('general', 'supportPhone', e.target.value)} />
        <Input label="Timezone" value={g.timezone || ''} onChange={(e) => patch('general', 'timezone', e.target.value)} />
        <Select label="Currency" value={g.currency || 'INR'} onChange={(e) => patch('general', 'currency', e.target.value)}>
          <option value="INR">INR</option>
          <option value="USD">USD</option>
        </Select>
      </Section>

      <Section title="Job settings">
        <Toggle label="Auto assignment" description="Automatically match eligible workers to new requests." checked={!!jobs.autoAssignment} onChange={(v) => patch('jobs', 'autoAssignment', v)} />
        <Input label="Maximum assignment radius (km)" type="number" value={jobs.maxAssignmentRadius ?? 10} onChange={(e) => patch('jobs', 'maxAssignmentRadius', Number(e.target.value))} />
        <Input label="Job cancellation window (minutes)" type="number" value={jobs.jobCancellationTime ?? 60} onChange={(e) => patch('jobs', 'jobCancellationTime', Number(e.target.value))} />
        <Toggle label="Emergency mode" description="Prioritize emergency-severity tickets in dispatch." checked={!!jobs.emergencyMode} onChange={(v) => patch('jobs', 'emergencyMode', v)} />
      </Section>

      <Section title="Worker settings">
        <Toggle label="Require verification" checked={!!workers.requireVerification} onChange={(v) => patch('workers', 'requireVerification', v)} />
        <Input label="Minimum rating" type="number" step="0.1" value={workers.minimumRating ?? 3.5} onChange={(e) => patch('workers', 'minimumRating', Number(e.target.value))} />
        <Input label="Maximum active jobs" type="number" value={workers.maximumActiveJobs ?? 5} onChange={(e) => patch('workers', 'maximumActiveJobs', Number(e.target.value))} />
      </Section>

      <Section title="Notifications">
        <Toggle label="Email notifications" checked={!!notes.email} onChange={(v) => patch('notifications', 'email', v)} />
        <Toggle label="SMS notifications" checked={!!notes.sms} onChange={(v) => patch('notifications', 'sms', v)} />
        <Toggle label="Push notifications" checked={!!notes.push} onChange={(v) => patch('notifications', 'push', v)} />
      </Section>

      <Section title="Security">
        <Toggle label="Session management" description="Invalidate sessions after idle timeout." checked={!!security.sessionManagement} onChange={(v) => patch('security', 'sessionManagement', v)} />
        <Input label="Max login attempts" type="number" value={security.loginAttempts ?? 5} onChange={(e) => patch('security', 'loginAttempts', Number(e.target.value))} />
        <Select label="Password policy" value={security.passwordPolicy || 'strong'} onChange={(e) => patch('security', 'passwordPolicy', e.target.value)}>
          <option value="basic">Basic</option>
          <option value="strong">Strong</option>
        </Select>
      </Section>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={save}
        loading={saving}
        title="Save settings"
        message="Apply these platform settings now?"
        confirmLabel="Save"
      />
    </div>
  );
};

const Section = ({ title, children }) => (
  <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
    <h2 className="text-sm font-bold text-white">{title}</h2>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>
  </section>
);

export default Settings;
