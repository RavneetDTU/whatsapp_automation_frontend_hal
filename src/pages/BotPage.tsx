import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, Plus, RotateCcw, Save, Send, Ticket, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { del, get, patch, post } from '../lib/api';
import type { Bot, BotAutofillItem, BotChatMessage, BotChatResponse } from '../types';
import { ErrorState } from '../components/ui/States';
import { Spinner } from '../components/ui/Spinner';

const BOT_SLOTS = [1, 2, 3, 4, 5] as const;
const BOT_SUPPORT_EMAIL = 'support@ayurvedicpromise.com';

interface SampleLead {
  lead_name: string;
  lead_phone: string;
  lead_email: string;
  lead_branch: string;
}

const EMPTY_SAMPLE: SampleLead = {
  lead_name: 'Demo patient',
  lead_phone: '+27820000000',
  lead_email: '',
  lead_branch: '',
};

function isBotSlot(value: string | undefined): value is `${(typeof BOT_SLOTS)[number]}` {
  return BOT_SLOTS.includes(Number(value) as (typeof BOT_SLOTS)[number]);
}

export function BotPage() {
  const { slot: slotParam } = useParams<{ slot: string }>();
  if (!isBotSlot(slotParam)) {
    return <Navigate to="/settings/bots/1" replace />;
  }
  return <BotEditor slot={Number(slotParam)} />;
}

function BotEditor({ slot }: { slot: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [persona, setPersona] = useState('');
  const [instructions, setInstructions] = useState('');
  const [steps, setSteps] = useState<string[]>(['']);
  const [basePrompt, setBasePrompt] = useState('');
  const [baseOpen, setBaseOpen] = useState(false);
  const [sample, setSample] = useState<SampleLead>(EMPTY_SAMPLE);
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const botQuery = useQuery<Bot>({
    queryKey: ['bot', slot],
    queryFn: () => get<Bot>(`/api/bots/${slot}`),
  });

  const chatQuery = useQuery<BotChatResponse>({
    queryKey: ['bot-chat', slot],
    queryFn: () => get<BotChatResponse>(`/api/bots/${slot}/chat`),
  });

  const autofillQuery = useQuery<{ items: BotAutofillItem[] }>({
    queryKey: ['bot-autofill', slot, sample],
    queryFn: () => {
      const params = new URLSearchParams({
        lead_name: sample.lead_name,
        lead_phone: sample.lead_phone,
        lead_email: sample.lead_email,
        lead_branch: sample.lead_branch,
      });
      return get<{ items: BotAutofillItem[] }>(`/api/bots/${slot}/autofill?${params}`);
    },
  });

  useEffect(() => {
    const bot = botQuery.data;
    if (!bot) return;
    setPersona(bot.persona ?? '');
    setInstructions(bot.instructions ?? '');
    setSteps(bot.steps?.length ? bot.steps : ['']);
    setBasePrompt(bot.base_prompt ?? '');
  }, [botQuery.data]);

  const messages = chatQuery.data?.messages ?? [];
  const autofill = autofillQuery.data?.items ?? botQuery.data?.autofill ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const saveMutation = useMutation({
    mutationFn: () =>
      patch<Bot>(`/api/bots/${slot}`, {
        persona,
        instructions,
        steps: steps.map((row) => row.trim()).filter(Boolean),
        base_prompt: basePrompt,
      }),
    onSuccess: (bot) => {
      qc.setQueryData(['bot', slot], bot);
      qc.invalidateQueries({ queryKey: ['bots'] });
      toast('success', `Bot ${slot} saved.`);
    },
    onError: (err: Error) => toast('error', err.message || 'Failed to save bot.'),
  });

  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      post<BotChatResponse>(`/api/bots/${slot}/chat`, {
        message,
        ...sample,
      }),
    onSuccess: (data) => {
      qc.setQueryData(['bot-chat', slot], data);
    },
    onError: (err: Error) => toast('error', err.message || 'Demo chat failed.'),
  });

  const resetMutation = useMutation({
    mutationFn: () => del<BotChatResponse>(`/api/bots/${slot}/chat`),
    onSuccess: (data) => {
      qc.setQueryData(['bot-chat', slot], data ?? { messages: [] });
      toast('success', 'Demo chat cleared.');
    },
    onError: (err: Error) => toast('error', err.message || 'Failed to reset demo.'),
  });

  function updateStep(index: number, value: string) {
    setSteps((rows) => rows.map((row, i) => (i === index ? value : row)));
  }

  function moveStep(index: number, direction: -1 | 1) {
    setSteps((rows) => {
      const next = [...rows];
      const target = index + direction;
      if (target < 0 || target >= next.length) return rows;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeStep(index: number) {
    setSteps((rows) => (rows.length <= 1 ? [''] : rows.filter((_, i) => i !== index)));
  }

  function sendDemo(e: React.FormEvent) {
    e.preventDefault();
    const message = draft.trim();
    if (!message || chatMutation.isPending) return;
    setDraft('');
    chatMutation.mutate(message);
  }

  const shownMessages = useMemo(() => {
    if (!chatMutation.isPending || !chatMutation.variables) return messages;
    return [...messages, { role: 'user', content: chatMutation.variables }];
  }, [chatMutation.isPending, chatMutation.variables, messages]);

  if (botQuery.isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Spinner />
      </div>
    );
  }

  if (botQuery.error) {
    return (
      <div className="p-8">
        <ErrorState message={(botQuery.error as Error).message} onRetry={botQuery.refetch} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-5">
      <div className="border-b border-slate-200/80 pb-4">
        <p className="text-xs font-semibold text-slate-500 mb-1">Calendar & Branch / Bot {slot}</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bot {slot}</h1>
        <p className="text-xs text-slate-500 mt-1">
          Tell this bot who it is, how it should talk, and what to do. Save, then try it in Demo before assigning it to a campaign.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
        <p className="flex-1 text-lg font-bold text-red-700 leading-snug">
          Tuning a perfect AI bot might require some expertise. Press this button to raise a support ticket to have an expert make changes in your bot.
        </p>
        <a
          className="inline-flex items-center justify-center gap-2 shrink-0 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          href={`mailto:${BOT_SUPPORT_EMAIL}?subject=${encodeURIComponent(`Hearing Aid Labs — expert tuning for Bot ${slot}`)}&body=${encodeURIComponent(`Please have an expert make changes to Bot ${slot} on Jarvis HAL.`)}`}
        >
          <Ticket size={16} />
          Raise a support ticket
        </a>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <form
          className="card p-6 space-y-5 bg-white"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
        >
          <Field
            label="Persona"
            hint="Who is this bot, and how should they sound?"
            htmlFor={`bot-${slot}-persona`}
          >
            <textarea
              id={`bot-${slot}-persona`}
              className="input min-h-[120px] font-normal"
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              placeholder="You are Riche, a warm consultant at Hearing Aid Labs. Short WhatsApp messages, one question at a time."
            />
          </Field>

          <Field
            label="Instructions"
            hint="What should this bot know and how should it handle the chat?"
            htmlFor={`bot-${slot}-instructions`}
          >
            <textarea
              id={`bot-${slot}-instructions`}
              className="input min-h-[180px] font-normal"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="How this bot should sell, what to mention, and what to avoid."
            />
          </Field>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="label mb-0">Do this</p>
                <p className="text-xs text-slate-500">Steps this bot should follow, in order.</p>
              </div>
              <button
                type="button"
                className="btn-secondary !px-3 !py-1.5 text-xs"
                onClick={() => setSteps((rows) => [...rows, ''])}
              >
                <Plus size={14} />
                Add step
              </button>
            </div>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="mt-2 w-6 text-xs font-semibold text-slate-400 shrink-0">{index + 1}.</span>
                  <input
                    className="input"
                    value={step}
                    onChange={(e) => updateStep(index, e.target.value)}
                    placeholder="e.g. Confirm the store on record"
                  />
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      className="w-7 h-7 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                      onClick={() => moveStep(index, -1)}
                      disabled={index === 0}
                      aria-label="Move step up"
                    >
                      <ChevronUp size={14} className="mx-auto" />
                    </button>
                    <button
                      type="button"
                      className="w-7 h-7 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                      onClick={() => moveStep(index, 1)}
                      disabled={index === steps.length - 1}
                      aria-label="Move step down"
                    >
                      <ChevronDown size={14} className="mx-auto" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="mt-1 w-7 h-7 rounded-md border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200"
                    onClick={() => removeStep(index)}
                    aria-label="Remove step"
                  >
                    <Trash2 size={13} className="mx-auto" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Filled in automatically</p>
            <p className="text-xs text-slate-500">
              The bot already receives these facts on every reply. You do not need to type them.
            </p>
            <ul className="divide-y divide-slate-200">
              {autofill.map((item) => (
                <li key={item.label} className="py-2 flex items-start justify-between gap-4">
                  <span className="text-xs font-medium text-slate-600">{item.label}</span>
                  <span className="text-xs text-slate-900 text-right">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-left"
              onClick={() => setBaseOpen((open) => !open)}
            >
              <div>
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Rules every bot follows</p>
                <p className="text-xs text-slate-500 mt-0.5">Shared booking rules. Changing this updates all five bots.</p>
              </div>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${baseOpen ? 'rotate-180' : ''}`} />
            </button>
            {baseOpen && (
              <div className="px-4 pb-4">
                <textarea
                  className="input min-h-[220px] font-mono text-xs"
                  value={basePrompt}
                  onChange={(e) => setBasePrompt(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
              <Save size={16} />
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>

        <div className="card bg-white flex flex-col min-h-[640px] xl:sticky xl:top-6">
          <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Demo</p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">Practice chat for Bot {slot}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Not sent on WhatsApp. Bookings are not written to Google Calendar.
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary !px-3 !py-1.5 text-xs"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
            >
              <RotateCcw size={14} />
              Reset demo
            </button>
          </div>

          <div className="px-5 py-4 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SampleField
              label="Name"
              value={sample.lead_name}
              onChange={(lead_name) => setSample((s) => ({ ...s, lead_name }))}
            />
            <SampleField
              label="Phone"
              value={sample.lead_phone}
              onChange={(lead_phone) => setSample((s) => ({ ...s, lead_phone }))}
            />
            <SampleField
              label="Email"
              value={sample.lead_email}
              onChange={(lead_email) => setSample((s) => ({ ...s, lead_email }))}
            />
            <SampleField
              label="Branch"
              value={sample.lead_branch}
              onChange={(lead_branch) => setSample((s) => ({ ...s, lead_branch }))}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-[280px] max-h-[480px]">
            {shownMessages.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-12">
                Save the form, then type as the customer to try this bot.
              </p>
            ) : (
              shownMessages.map((msg, i) => <ChatBubble key={`${msg.role}-${i}`} message={msg} />)
            )}
            {chatMutation.isPending && (
              <p className="text-xs text-slate-400 px-1">Bot {slot} is typing…</p>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendDemo} className="p-4 border-t border-slate-100 flex gap-2">
            <input
              className="input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a customer message…"
              disabled={chatMutation.isPending}
            />
            <button type="submit" className="btn-primary shrink-0" disabled={chatMutation.isPending || !draft.trim()}>
              <Send size={16} />
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="label mb-0">
        {label}
      </label>
      <p className="text-xs text-slate-500">{hint}</p>
      {children}
    </div>
  );
}

function SampleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function ChatBubble({ message }: { message: BotChatMessage }) {
  const fromBot = message.role === 'assistant';
  return (
    <div className={`flex ${fromBot ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          fromBot ? 'bg-slate-100 text-slate-800' : 'bg-indigo-600 text-white'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
