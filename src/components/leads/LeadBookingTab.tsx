import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../context/ToastContext';
import { get, post } from '../../lib/api';
import type {
  CalendarResponse,
  Campaign,
  LeadBookingRequest,
  LeadDetail,
  ManualBookingResult,
} from '../../types';
import { Spinner } from '../ui/Spinner';
import { ErrorState } from '../ui/States';

const SERVICES = [
  { value: 'free_screening', label: 'Free Hearing Screening Test' },
  { value: 'full_diagnostic', label: 'Full Diagnostic Hearing Assessment' },
  { value: 'ear_wax_removal', label: 'Ear Wax Removal Appointment' },
] as const;

function todayIso(): string {
  const value = new Date();
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function storeToken(value: string): string {
  let text = (value || '').toLowerCase();
  for (const word of ['branch', 'store']) {
    text = text.replaceAll(word, ' ');
  }
  return text.replace(/[^a-z0-9]/g, '');
}

function matchRecordedStore(branch: string, calendars: CalendarResponse[]): CalendarResponse | null {
  const token = storeToken(branch);
  if (token.length < 4) return null;
  const hits = new Map<number, CalendarResponse>();
  for (const calendar of calendars) {
    const nameToken = storeToken(calendar.display_name || '');
    const locationToken = storeToken(calendar.location || '');
    const matched = [nameToken, locationToken].some(
      (candidate) =>
        candidate &&
        (token === candidate || candidate.startsWith(token) || token.startsWith(candidate)),
    );
    if (matched) hits.set(calendar.id, calendar);
  }
  if (hits.size !== 1) return null;
  return [...hits.values()][0];
}

export function LeadBookingTab({ leadId }: { leadId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [calendarId, setCalendarId] = useState('');
  const [testType, setTestType] = useState<string>(SERVICES[0].value);
  const [date, setDate] = useState(todayIso);
  const [time, setTime] = useState('10:00');

  const leadQuery = useQuery<LeadDetail>({
    queryKey: ['lead', leadId],
    queryFn: () => get<LeadDetail>(`/api/leads/${leadId}`),
  });
  const calendarsQuery = useQuery<CalendarResponse[]>({
    queryKey: ['calendars'],
    queryFn: () => get<CalendarResponse[]>('/api/calendars'),
  });
  const campaignsQuery = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: () => get<Campaign[]>('/api/campaigns?limit=100'),
  });

  const stores = useMemo(
    () => (calendarsQuery.data ?? []).filter((row) => row.is_connected),
    [calendarsQuery.data],
  );
  const lead = leadQuery.data;
  const matchedStoreId = useMemo(() => {
    if (!lead?.branch || stores.length === 0) return '';
    const matched = matchRecordedStore(lead.branch, stores);
    return matched ? String(matched.id) : '';
  }, [lead?.branch, stores]);
  const selectedCalendarId = calendarId || matchedStoreId;
  const campaignReminder = (campaignsQuery.data ?? []).find((row) => row.id === lead?.campaign_id)
    ?.reminder_template_name;
  const reminderName = lead?.reminder_template_name ?? campaignReminder;
  const reminderLoaded = lead?.reminder_template_name !== undefined || campaignsQuery.isFetched;
  const hasReminder = Boolean(reminderName?.trim());

  const mutation = useMutation({
    mutationFn: (body: LeadBookingRequest) =>
      post<ManualBookingResult>(`/api/leads/${leadId}/appointments`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead', leadId] });
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['daily-appointments'] });
      toast(
        'success',
        hasReminder
          ? 'Appointment booked.'
          : 'Appointment added to the store calendar. WhatsApp reminder will not be sent.',
      );
      setDate(todayIso());
      setTime('10:00');
      setTestType(SERVICES[0].value);
    },
    onError: (err: Error) => toast('error', err.message || 'Failed to book appointment.'),
  });

  const canSubmit =
    Boolean(selectedCalendarId) && Boolean(date) && Boolean(time) && Boolean(lead) && !mutation.isPending;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    mutation.mutate({
      calendar_id: Number(selectedCalendarId),
      test_type: testType,
      date,
      time,
    });
  }

  if (leadQuery.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="md" />
      </div>
    );
  }
  if (leadQuery.error) {
    return <ErrorState message={(leadQuery.error as Error).message} onRetry={leadQuery.refetch} />;
  }
  if (!lead) return null;

  return (
    <form className="space-y-4 max-w-xl" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Full name</label>
          <input className="input bg-slate-50 cursor-default" value={lead.full_name} readOnly />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input bg-slate-50 cursor-default" value={lead.phone} readOnly />
        </div>
      </div>
      <div>
        <label className="label">Campaign</label>
        <input className="input bg-slate-50 cursor-default" value={lead.campaign_name ?? '—'} readOnly />
      </div>

      {reminderLoaded && !hasReminder ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This campaign has no reminder template. The appointment will still be added to the store
          calendar, and the day-before WhatsApp reminder will not be sent.
        </p>
      ) : null}

      <label className="block">
        <span className="label">Store</span>
        <select
          required
          className="select"
          value={selectedCalendarId}
          onChange={(event) => setCalendarId(event.target.value)}
          disabled={calendarsQuery.isLoading}
        >
          <option value="">{calendarsQuery.isLoading ? 'Loading stores…' : 'Select a store'}</option>
          {stores.map((row) => (
            <option key={row.id} value={row.id}>
              {row.display_name}
            </option>
          ))}
        </select>
        {!calendarsQuery.isLoading && stores.length === 0 ? (
          <p className="text-xs text-slate-500 mt-1.5">Connect a store calendar before booking.</p>
        ) : (
          <p className="text-xs text-slate-500 mt-1.5">
            Times are in the store&apos;s local timezone (Africa/Johannesburg by default).
          </p>
        )}
      </label>

      <label className="block">
        <span className="label">Service</span>
        <select className="select" value={testType} onChange={(event) => setTestType(event.target.value)}>
          {SERVICES.map((row) => (
            <option key={row.value} value={row.value}>
              {row.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="label">Date</span>
          <input
            required
            type="date"
            className="input"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="label">Time</span>
          <input
            required
            type="time"
            className="input"
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
        </label>
      </div>

      {mutation.isError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {(mutation.error as Error).message || 'Failed to book appointment.'}
        </p>
      ) : null}

      <div className="flex justify-end pt-1">
        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          {mutation.isPending ? <Spinner size="sm" /> : null}
          {mutation.isPending ? 'Booking…' : 'Book appointment'}
        </button>
      </div>
    </form>
  );
}
