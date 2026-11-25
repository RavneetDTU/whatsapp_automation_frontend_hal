import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { post, get } from '../../lib/api';
import type { CalendarResponse, Campaign, ManualBookingRequest, ManualBookingResult } from '../../types';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';

const SERVICES = [
  { value: 'free_screening', label: 'Free Hearing Screening Test' },
  { value: 'full_diagnostic', label: 'Full Diagnostic Hearing Assessment' },
  { value: 'ear_wax_removal', label: 'Ear Wax Removal Appointment' },
] as const;

interface ManualBookingModalProps {
  open: boolean;
  defaultDate: string;
  onClose: () => void;
  onBooked: (item: ManualBookingResult) => void;
}

export function ManualBookingModal({ open, defaultDate, onClose, onBooked }: ManualBookingModalProps) {
  const [calendarId, setCalendarId] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [testType, setTestType] = useState<string>(SERVICES[0].value);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('10:00');

  useEffect(() => {
    if (!open) return;
    setDate(defaultDate);
  }, [open, defaultDate]);

  const calendarsQuery = useQuery<CalendarResponse[]>({
    queryKey: ['calendars'],
    queryFn: () => get<CalendarResponse[]>('/api/calendars'),
    enabled: open,
  });
  const campaignsQuery = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: () => get<Campaign[]>('/api/campaigns?limit=100'),
    enabled: open,
  });

  const stores = useMemo(
    () => (calendarsQuery.data ?? []).filter((row) => row.is_connected),
    [calendarsQuery.data],
  );
  const campaigns = campaignsQuery.data ?? [];
  const bookableCampaigns = campaigns.filter((row) => Boolean(row.reminder_template_name?.trim()));

  const mutation = useMutation({
    mutationFn: (body: ManualBookingRequest) => post<ManualBookingResult>('/api/appointments', body),
    onSuccess: (item) => {
      onBooked(item);
      setFullName('');
      setPhone('');
      setEmail('');
      setTime('10:00');
    },
  });

  const canSubmit =
    Boolean(calendarId) &&
    Boolean(campaignId) &&
    Boolean(fullName.trim()) &&
    Boolean(phone.trim()) &&
    Boolean(date) &&
    Boolean(time) &&
    !mutation.isPending;

  function handleClose() {
    if (mutation.isPending) return;
    mutation.reset();
    onClose();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    mutation.mutate({
      calendar_id: Number(calendarId),
      campaign_id: campaignId,
      full_name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      test_type: testType,
      date,
      time,
    });
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Book appointment"
      subtitle="Creates a calendar event and a reminder for the day before."
      maxWidth="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={handleClose} disabled={mutation.isPending}>
            Cancel
          </button>
          <button type="submit" form="manual-booking-form" className="btn-primary" disabled={!canSubmit}>
            {mutation.isPending ? <Spinner size="sm" /> : null}
            {mutation.isPending ? 'Booking…' : 'Book appointment'}
          </button>
        </>
      }
    >
      <form id="manual-booking-form" className="space-y-4" onSubmit={handleSubmit}>
        {mutation.isError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {(mutation.error as Error).message || 'Failed to book appointment.'}
          </p>
        ) : null}

        <label className="block">
          <span className="label">Store</span>
          <select
            required
            className="select"
            value={calendarId}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="label">Full name</span>
            <input
              required
              className="input"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="label">Phone</span>
            <input
              required
              className="input"
              inputMode="tel"
              placeholder="082 123 4567"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
        </div>

        <label className="block">
          <span className="label">
            Email <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="block">
          <span className="label">Campaign</span>
          <select
            required
            className="select"
            value={campaignId}
            onChange={(event) => setCampaignId(event.target.value)}
            disabled={campaignsQuery.isLoading}
          >
            <option value="">{campaignsQuery.isLoading ? 'Loading campaigns…' : 'Select a campaign'}</option>
            {campaigns.map((row) => {
              const hasReminder = Boolean(row.reminder_template_name?.trim());
              return (
                <option key={row.id} value={row.id} disabled={!hasReminder}>
                  {hasReminder ? row.name : `${row.name} (no reminder template)`}
                </option>
              );
            })}
          </select>
          <p className="text-xs text-slate-500 mt-1.5">
            If this phone already belongs to a live lead, the reminder uses that lead&apos;s campaign.
            The campaign above is used only when the phone is new.
          </p>
          {!campaignsQuery.isLoading && bookableCampaigns.length === 0 ? (
            <p className="text-xs text-rose-600 mt-1.5">
              Assign a reminder template on a campaign before booking.
            </p>
          ) : null}
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
      </form>
    </Modal>
  );
}
