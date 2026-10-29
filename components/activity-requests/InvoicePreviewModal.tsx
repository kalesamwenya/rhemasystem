'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Printer, X } from 'lucide-react';

type InvoicePreviewModalProps = {
  url: string;
  fileName: string;
  onClose: () => void;
};

export function InvoicePreviewModal({ url, fileName, onClose }: InvoicePreviewModalProps) {
  const [previewReady, setPreviewReady] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  function downloadInvoice() {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function printInvoice() {
    if (!previewReady) return;
    const preview = previewRef.current?.contentWindow;
    if (!preview) return;
    preview.focus();
    preview.print();
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-preview-title"
        tabIndex={-1}
        className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-none"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 id="invoice-preview-title" className="truncate text-sm font-black text-slate-950">Invoice preview</h2>
            <p className="truncate text-xs text-slate-500">{fileName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={downloadInvoice} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
              <Download size={14} /> Download
            </button>
            <button type="button" onClick={printInvoice} disabled={!previewReady} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50">
              <Printer size={14} /> Print
            </button>
            <button type="button" onClick={onClose} aria-label="Close invoice preview" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 bg-slate-100 p-2 sm:p-4">
          <iframe ref={previewRef} src={url} title={fileName} onLoad={() => setPreviewReady(true)} className="h-[72vh] min-h-[360px] w-full rounded-lg border border-slate-200 bg-white" />
        </div>
      </section>
    </div>
  );
}
