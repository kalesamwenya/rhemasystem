export type ChatbotResponse = {
  id: number;
  intent_key: string;
  title: string;
  keywords: string;
  response_text: string;
  action_label: string;
  action_url: string;
  priority: number;
  enabled: number | boolean;
  updated_at: string;
};

export type ChatbotLead = {
  id: number;
  name: string;
  email: string;
  phone: string;
  enquiry: string;
  source_action: string;
  page_path: string;
  status: 'new' | 'contacted' | 'closed';
  created_at: string;
  replies: ChatbotLeadReply[];
};

export type ChatbotLeadReply = {
  id: number;
  lead_id: number;
  admin_id: number;
  admin_name: string;
  reply_text: string;
  delivery_status: 'pending' | 'sent' | 'failed';
  created_at: string;
};

export type ChatbotSettings = {
  school_address: string;
  map_url: string;
  fallback_response: string;
};

export type ChatbotDashboardData = {
  responses: ChatbotResponse[];
  settings: ChatbotSettings;
  metrics: { conversations: number; questions: number; matched: number; unmatched: number; ambiguous: number; actions: number };
  top_questions: Array<{ question: string; count: number; match_status: string }>;
  top_responses: Array<{ title: string; count: number }>;
  actions: Array<{ action_label: string; action_target: string; count: number }>;
  unmatched: Array<{ id: number; user_text: string; match_status: string; page_path: string; created_at: string }>;
  leads: ChatbotLead[];
  conflicts: Array<{ first: string; second: string; keywords: string[]; same_priority: boolean }>;
};

export type ChatbotTab = 'overview' | 'responses' | 'mismatches' | 'leads' | 'settings';

export type ChatbotResponseForm = {
  id?: number;
  intent_key: string;
  title: string;
  keywords: string;
  response_text: string;
  action_label: string;
  action_url: string;
  priority: number;
  enabled: boolean;
};

export const EMPTY_CHATBOT_RESPONSE: ChatbotResponseForm = {
  intent_key: '',
  title: '',
  keywords: '',
  response_text: '',
  action_label: '',
  action_url: '',
  priority: 0,
  enabled: true,
};

export const CHATBOT_TABS: Array<{ id: ChatbotTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'responses', label: 'Keywords & responses' },
  { id: 'mismatches', label: 'Mismatch checker' },
  { id: 'leads', label: 'Messages & replies' },
  { id: 'settings', label: 'Location & settings' },
];

export function displayChatbotDate(value: string): string {
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function createChatbotIntentKey(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
  return `${slug || 'unanswered'}-${Date.now().toString().slice(-5)}`;
}
