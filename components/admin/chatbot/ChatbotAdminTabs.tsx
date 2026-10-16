'use client';

import { AlertTriangle, BarChart3, Bot, MessageSquareText, Settings2, Users } from 'lucide-react';
import type { ChatbotTab } from './types';

const icons = {
  overview: BarChart3,
  responses: MessageSquareText,
  mismatches: AlertTriangle,
  leads: Users,
  settings: Settings2,
} satisfies Record<ChatbotTab, typeof Bot>;

const tabs: Array<{ id: ChatbotTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'responses', label: 'Keywords & responses' },
  { id: 'mismatches', label: 'Mismatch checker' },
  { id: 'leads', label: 'Messages & replies' },
  { id: 'settings', label: 'Location & settings' },
];

type Props = { activeTab: ChatbotTab; onChange: (tab: ChatbotTab) => void };

export default function ChatbotAdminTabs({ activeTab, onChange }: Props) {
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5">
      {tabs.map(({ id, label }) => {
        const Icon = icons[id];
        return <button type="button" key={id} onClick={() => onChange(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition ${activeTab === id ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}><Icon size={15} />{label}</button>;
      })}
    </nav>
  );
}
