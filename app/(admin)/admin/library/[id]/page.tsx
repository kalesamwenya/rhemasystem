'use client';

import React, { useState } from 'react';
import { Save, Trash2, ArrowLeft, History, Edit3, ShieldAlert, Archive } from 'lucide-react';
import Link from 'next/link';

export default function LibraryDetail({ assetId = "ASSET-102" }) {
  const [isEditing, setIsEditing] = useState(false);
  const [assetData, setAssetData] = useState({
    title: "Software Architecture Patterns",
    author: "Mark Richards",
    isbn: "978-1491971437",
    category: "Textbook",
    status: "Available"
  });

  return (
    <div className="max-w-8xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Back Navigation */}
      <Link href="/admin/library" className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 transition-colors">
        <ArrowLeft className="h-3 w-3" /> Return to Inventory
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor Console */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
          <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
            <h2 className="text-sm font-black uppercase tracking-wider">Registry File: {assetId}</h2>
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isEditing ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-600'}`}
            >
              {isEditing ? <><Archive className="h-3 w-3" /> Cancel Update</> : <><Edit3 className="h-3 w-3" /> Enter Edit Mode</>}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(assetData).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400">{key}</label>
                <input 
                  disabled={!isEditing}
                  className={`w-full p-2.5 rounded-xl border text-xs font-bold transition-all ${isEditing ? 'bg-white border-slate-300' : 'bg-slate-50 border-transparent text-slate-600'}`}
                  value={value}
                  onChange={(e) => setAssetData({...assetData, [key]: e.target.value})}
                />
              </div>
            ))}
          </div>

          {isEditing && (
            <button className="mt-8 w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95">
              <Save className="h-3.5 w-3.5" /> Commit Registry Changes
            </button>
          )}
        </div>

        {/* Sidebar Status & History Log */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4">Asset Status</h4>
            <div className={`p-4 rounded-xl border font-black text-center ${assetData.status === 'Available' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
              {assetData.status.toUpperCase()}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 mb-4">
              <History className="h-3.5 w-3.5" /> Audit Trail
            </div>
            <div className="space-y-3 text-[10px] font-medium text-slate-500">
              <p>• Added by Admin (May 20, 2026)</p>
              <p>• Status changed to Available (May 21, 2026)</p>
            </div>
          </div>

          <button className="w-full flex items-center justify-center gap-2 text-rose-600 border border-rose-100 bg-rose-50 p-3 rounded-xl text-[10px] font-black uppercase hover:bg-rose-100 transition-all">
            <Trash2 className="h-3.5 w-3.5" /> Remove Asset
          </button>
        </div>
      </div>
    </div>
  );
}