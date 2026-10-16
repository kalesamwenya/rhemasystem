'use client';

import React, { useState } from 'react';
import { UploadCloud, ArrowLeft, Paperclip, FileText, Globe, CheckCircle2, Trash2, FolderSync } from 'lucide-react';
import Link from 'next/link';

export default function DistributeMaterialsPage() {
  const [vaultAssets, setVaultAssets] = useState([
    { id: 1, title: 'Course Core Blueprint & Lab Set Parameters', group: 'Syllabus Documentation', fileWeight: '2.4 MB', variant: 'PDF Document' },
    { id: 2, title: 'Dynamic Storage Index Execution Script Pack', group: 'Practical Asset Source', fileWeight: '412 KB', variant: 'SQL Script File' }
  ]);

  const [formState, setFormState] = useState({ title: '', group: 'Syllabus Documentation', variant: 'PDF Document' });

  const handleUploadAssetMock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.title) return;
    setVaultAssets([...vaultAssets, {
      id: Date.now(), title: formState.title, group: formState.group,
      fileWeight: `${(Math.random() * 4 + 1).toFixed(1)} MB`, variant: formState.variant
    }]);
    setFormState({ title: '', group: 'Syllabus Documentation', variant: 'PDF Document' });
  };

  const handlePurgeAsset = (id: number) => {
    setVaultAssets(vaultAssets.filter(asset => asset.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-16 animate-in fade-in duration-300">
      
      {/* Structural Page Header Container block layout matrix */}
      <div className="lg:col-span-3 space-y-1 pb-4 border-b border-slate-200/80">
        <Link href="/admin/courses" className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Back to Catalog
        </Link>
        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Reference Asset Depot</h1>
        <p className="text-xs text-slate-500 font-medium">Distribute reference source documents, compile syllabus documentation, and track repository asset load parameters.</p>
      </div>

      {/* Asset Repository Upload Engine Card Setup */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs h-fit space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <UploadCloud className="h-4 w-4 text-indigo-600" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Enlist Media Vault Asset</h3>
        </div>

        <form onSubmit={handleUploadAssetMock} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Asset Label Title</label>
            <input 
              type="text" required placeholder="e.g. Lambda Calculus Reference Guide sheet" value={formState.title}
              onChange={(e) => setFormState({...formState, title: e.target.value})}
              className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-medium text-slate-900 focus:border-slate-950"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Asset Sorting Group</label>
            <select 
              value={formState.group} onChange={(e) => setFormState({...formState, group: e.target.value})}
              className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-bold bg-white text-slate-900 focus:border-slate-950"
            >
              <option value="Syllabus Documentation">Syllabus Core Document</option>
              <option value="Practical Asset Source">Practical Laboratory Resource</option>
              <option value="Supplemental Module Reading">Supplemental Case Literature</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Media Structural Type</label>
            <select 
              value={formState.variant} onChange={(e) => setFormState({...formState, variant: e.target.value})}
              className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-bold bg-white text-slate-900 focus:border-slate-950"
            >
              <option value="PDF Document">PDF Document Format</option>
              <option value="SQL Script File">Source Code / Script Bundle</option>
              <option value="Reference URL Link">External URL Routing Portal</option>
            </select>
          </div>

          {/* Upload Drag and Drop Frame Context mock component layout */}
          <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors group cursor-pointer">
            <Paperclip className="h-5 w-5 text-slate-400 group-hover:text-slate-900 transition-colors mx-auto mb-1" />
            <span className="text-[11px] font-bold text-slate-700 block">Attach Binary Blob Asset</span>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mt-0.5">PDF, ZIP, SQL UP TO 40MB Max threshold</span>
          </div>

          <button type="submit" className="w-full py-2.5 bg-slate-950 text-white text-xs font-black tracking-wide uppercase rounded-xl hover:bg-slate-900 transition-all">
            Distribute Repository Asset
          </button>
        </form>
      </div>

      {/* Right Column Layout Index Matrix List Display (READ/DELETE) */}
      <div className="lg:col-span-2 space-y-3">
        <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
          <span>Active Course Library Resources</span>
          <span>{vaultAssets.length} Artifacts Linked</span>
        </div>

        <div className="space-y-2">
          {vaultAssets.length > 0 ? (
            vaultAssets.map((asset) => (
              <div key={asset.id} className="bg-white border border-slate-200/80 p-4 rounded-xl flex items-center justify-between gap-4 shadow-3xs hover:border-slate-400 transition-all group">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 group-hover:bg-slate-950 group-hover:text-white transition-all shrink-0">
                    {asset.variant === 'Reference URL Link' ? <Globe className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{asset.group}</span>
                      <span className="h-1 w-1 bg-slate-300 rounded-full" />
                      <span className="font-mono text-[10px] font-bold text-slate-500">{asset.fileWeight}</span>
                    </div>
                    <p className="font-bold text-slate-900 text-sm truncate pr-2">{asset.title}</p>
                    <span className="text-[10px] font-mono font-bold text-blue-600 block">{asset.variant}</span>
                  </div>
                </div>

                <button onClick={() => handlePurgeAsset(asset.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-all shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white border border-slate-200 border-dashed rounded-2xl space-y-1">
              <FolderSync className="h-6 w-6 text-slate-300 mx-auto" />
              <p className="text-slate-900 font-bold text-xs">Resource Repositories Clear</p>
              <p className="text-[11px] text-slate-400">Distribute reference readings and documentation links into student portal feeds.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}