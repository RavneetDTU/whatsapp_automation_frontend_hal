import type { WatiTemplate } from '../../types';
import { TemplateChrome } from '../chat/TemplateChrome';

export function firstName(fullName: string): string {
  const trimmed = (fullName || '').trim();
  return trimmed.split(/\s+/)[0] || trimmed;
}

export function fillTemplateBody(body: string, fullName: string): string {
  const first = firstName(fullName);
  const whole = (fullName || '').trim() || first;
  const values: Record<string, string> = {
    name: first,
    first_name: first,
    customer_name: whole,
    lead_name: whole,
    full_name: whole,
    '1': first,
  };
  return (body || '').replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, raw: string) => {
    const key = String(raw).trim();
    if (/^\d+$/.test(key)) return first;
    const lowered = key.toLowerCase().replace(/ /g, '_');
    return values[lowered] || values[key] || first;
  });
}

interface TemplateMessagePreviewProps {
  template: WatiTemplate | null;
  leadName?: string;
  note?: string | null;
}

export function TemplateMessagePreview({
  template,
  leadName = 'Lead',
  note,
}: TemplateMessagePreviewProps) {
  const filledBody = template ? fillTemplateBody(template.body_preview, leadName) : '';
  const caption = note === undefined
    ? 'Preview uses a sample name. Each lead gets their own name filled in.'
    : note;

  return (
    <div className="h-full min-h-0 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Message preview</p>
      {!template ? (
        <p className="text-sm text-slate-400">Select a template to preview the complete message.</p>
      ) : (
        <div className="space-y-3">
          {caption ? <p className="text-xs text-slate-500">{caption}</p> : null}
          <div className="max-w-sm mx-auto rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="px-4 pt-3 pb-3">
              <TemplateChrome template={template} part="header" />
              <p className="text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed">
                {filledBody || 'No message body is available for this template.'}
              </p>
              <TemplateChrome template={template} part="footer" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
