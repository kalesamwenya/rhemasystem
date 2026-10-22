'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

type SlipFeedbackAlertProps = {
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  onClose: () => void;
  confirmText?: string;
  actionHref?: string;
  actionText?: string;
};

const appearance = {
  success: {
    icon: CheckCircle2,
    iconClass: 'border-emerald-200 bg-emerald-50 text-emerald-600',
    buttonClass: 'bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-emerald-300',
  },
  error: {
    icon: XCircle,
    iconClass: 'border-red-200 bg-red-50 text-red-600',
    buttonClass: 'bg-red-700 hover:bg-red-800 focus-visible:ring-red-300',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'border-amber-200 bg-amber-50 text-amber-700',
    buttonClass: 'bg-amber-700 hover:bg-amber-800 focus-visible:ring-amber-300',
  },
};

export default function SlipFeedbackAlert({
  type,
  title,
  message,
  onClose,
  confirmText = 'Continue',
  actionHref,
  actionText,
}: SlipFeedbackAlertProps) {
  const style = appearance[type];
  const Icon = style.icon;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="slip-feedback-title"
        aria-describedby="slip-feedback-message"
        aria-modal="true"
        className="w-full max-w-md animate-in fade-in zoom-in-95 rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-2xl duration-200 sm:p-8"
        role="alertdialog"
      >
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 ${style.iconClass}`}>
          <Icon aria-hidden="true" className="h-8 w-8" strokeWidth={2} />
        </div>
        <h2 id="slip-feedback-title" className="mt-5 text-xl font-black tracking-tight text-slate-950">{title}</h2>
        <p id="slip-feedback-message" className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{message}</p>
        {actionHref && actionText && (
          <Link href={actionHref} className="mt-5 inline-flex items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-black text-amber-950 transition hover:bg-amber-100">
            {actionText}
          </Link>
        )}
        <button
          autoFocus
          type="button"
          onClick={onClose}
          className={`mt-6 inline-flex min-w-32 items-center justify-center rounded-xl px-5 py-3 text-sm font-black text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-4 ${style.buttonClass}`}
        >
          {confirmText}
        </button>
      </section>
    </div>
  );
}
