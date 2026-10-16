'use client';

import { FormEvent } from 'react';
import { Save } from 'lucide-react';
import type { ChatbotSettings } from './types';

type Props = {
  settings: ChatbotSettings;
  saving: boolean;
  onChange: (settings: ChatbotSettings) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
};

const fieldClass = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-900';

export default function ChatbotSettingsPanel({ settings, saving, onChange, onSave }: Props) {
  return (
    <section className="max-w-3xl space-y-5">
      <div><h2 className="text-lg font-black text-slate-950">School location and fallback answer</h2><p className="mt-1 text-sm text-slate-600">The location is shown in the public chatbot only after both address and map link are saved. Use a shareable HTTPS Google Maps link.</p></div>
      <form onSubmit={onSave} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
        <label className="block space-y-1.5 text-xs font-bold text-slate-600">School address<input maxLength={255} value={settings.school_address} onChange={(event) => onChange({ ...settings, school_address: event.target.value })} placeholder="Building, street, town/city, country" className={fieldClass} /></label>
        <label className="block space-y-1.5 text-xs font-bold text-slate-600">Google Maps share URL<input type="url" maxLength={500} value={settings.map_url} onChange={(event) => onChange({ ...settings, map_url: event.target.value })} placeholder="https://maps.google.com/maps?..." className={fieldClass} /><span className="block text-[10px] font-normal text-slate-500">Use a Google Maps URL; external redirects are not accepted.</span></label>
        <label className="block space-y-1.5 text-xs font-bold text-slate-600">Fallback response<textarea required minLength={5} maxLength={2000} rows={3} value={settings.fallback_response} onChange={(event) => onChange({ ...settings, fallback_response: event.target.value })} className={fieldClass} /></label>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"><Save size={14} />{saving ? 'Saving...' : 'Save chatbot settings'}</button>
      </form>
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-900"><p className="font-black">What is collected?</p><p className="mt-1">The system stores visitor questions, the page they were asked on, response match status, clicked chatbot links, and any contact details explicitly submitted as an enquiry. Analytics reports cover 30 days; the review list shows up to 100 recent mismatches.</p></div>
    </section>
  );
}
