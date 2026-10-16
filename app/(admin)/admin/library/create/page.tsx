'use client';

import React, { useState, useRef } from 'react';
import { ArrowLeft, UploadCloud, CheckCircle2, Link2, Headphones, FileText, X, Trash2, File } from 'lucide-react';
import Link from 'next/link';

const courseOptions = ['Database Systems', 'Research Methods', 'Communication Skills', 'Systems Analysis', 'General'];
const sessionOptions = ['Session 1', 'Session 2', 'Session 3', 'Session 4', 'Week 3', 'Orientation'];

type ResourceType = 'Document' | 'Link' | 'Audio';

export default function AdvancedCreateAsset() {
  const [resourceType, setResourceType] = useState<ResourceType>('Document');
  const [formData, setFormData] = useState({
    title: '',
    course: 'Database Systems',
    session: 'Session 1',
    author: '',
    url: '',
    description: '',
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle adding new files without replacing existing selections
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const incomingFiles = Array.from(event.target.files);
      setSelectedFiles((prev) => [...prev, ...incomingFiles]);
    }
  };

  // Remove individual file from upload queue
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    // Implement API submission logic here (e.g. FormData)
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  // Dynamic file extensions based on active resource type
  const getAcceptedExtensions = () => {
    if (resourceType === 'Audio') return 'audio/*,.mp3,.wav,.m4a,.aac,.ogg';
    if (resourceType === 'Document') return '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt';
    return '*';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/library" className="p-2 border rounded-xl hover:bg-slate-50 transition-colors">
            <ArrowLeft className="h-4 w-4 text-slate-600" />
          </Link>
          <h1 className="text-lg font-black uppercase text-slate-900">Add Resource</h1>
        </div>
        <div className="text-[10px] font-bold text-slate-400">RESOURCE WORKFLOW</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upload & Resource Type Selector */}
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase text-slate-400">Resource Type</label>
          <div className="grid grid-cols-3 gap-2">
            {(['Document', 'Link', 'Audio'] as ResourceType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setResourceType(type);
                  setSelectedFiles([]); // Reset file queue when type changes
                }}
                className={`rounded-xl border px-3 py-3 text-[10px] font-black uppercase tracking-[0.15em] transition-all ${
                  resourceType === type ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {type === 'Document' ? <FileText className="mx-auto mb-1 h-4 w-4" /> : type === 'Link' ? <Link2 className="mx-auto mb-1 h-4 w-4" /> : <Headphones className="mx-auto mb-1 h-4 w-4" />}
                {type}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center space-y-3">
            <UploadCloud className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-[10px] font-bold text-slate-500">
              {resourceType === 'Audio' ? 'Upload audio files (MP3, WAV, M4A) or attach link' : resourceType === 'Link' ? 'Add external learning link' : 'Upload multiple documents (PDF, DOCX)'}
            </p>

            {resourceType !== 'Link' && (
              <div className="pt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={getAcceptedExtensions()}
                  className="hidden"
                  id="multi-file-input"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="multi-file-input"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-100 transition-all shadow-2xs"
                >
                  <UploadCloud className="h-4 w-4 text-slate-500" />
                  Choose Files
                </label>
              </div>
            )}

            {resourceType === 'Link' && (
              <input
                value={formData.url}
                onChange={(event) => setFormData({ ...formData, url: event.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                placeholder="https://..."
              />
            )}

            {resourceType === 'Audio' && (
              <div className="pt-2 space-y-2">
                <p className="text-[10px] text-slate-400 font-medium">Or attach external stream URL:</p>
                <input
                  value={formData.url}
                  onChange={(event) => setFormData({ ...formData, url: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  placeholder="https://audio-stream-link.com/file.mp3"
                />
              </div>
            )}
          </div>

          {/* Selected File List Queue */}
          {selectedFiles.length > 0 && resourceType !== 'Link' && (
            <div className="space-y-2 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400">Selected Files ({selectedFiles.length})</span>
                <button type="button" onClick={() => setSelectedFiles([])} className="text-[10px] font-bold text-rose-500 hover:underline flex items-center gap-1">
                  <Trash2 className="h-3 w-3" /> Clear All
                </button>
              </div>
              <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedFiles.map((file, idx) => (
                  <li key={`${file.name}-${idx}`} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center gap-2 truncate pr-2">
                      {resourceType === 'Audio' ? <Headphones className="h-4 w-4 text-indigo-500 shrink-0" /> : <File className="h-4 w-4 text-slate-400 shrink-0" />}
                      <div className="truncate">
                        <p className="font-bold text-slate-800 text-[11px] truncate">{file.name}</p>
                        <p className="text-[9px] text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeFile(idx)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Form Metadata */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Resource Title</label>
            <input
              value={formData.title}
              onChange={(event) => setFormData({ ...formData, title: event.target.value })}
              className="w-full border border-slate-200 p-3 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              placeholder="Enter resource title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Course</label>
              <select
                value={formData.course}
                onChange={(event) => setFormData({ ...formData, course: event.target.value })}
                className="w-full border border-slate-200 p-3 rounded-xl text-xs font-semibold bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              >
                {courseOptions.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Session</label>
              <select
                value={formData.session}
                onChange={(event) => setFormData({ ...formData, session: event.target.value })}
                className="w-full border border-slate-200 p-3 rounded-xl text-xs font-semibold bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              >
                {sessionOptions.map((session) => (
                  <option key={session} value={session}>
                    {session}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Author / Owner</label>
            <input
              value={formData.author}
              onChange={(event) => setFormData({ ...formData, author: event.target.value })}
              className="w-full border border-slate-200 p-3 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              placeholder="Lecturer or department"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Description</label>
            <textarea
              value={formData.description}
              onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              className="w-full border border-slate-200 p-3 rounded-xl text-xs font-medium min-h-[120px] focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              placeholder="Outline how the resource is used in the learning session."
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> {saved ? 'Saved to resource center' : 'Ready to commit'}
            </div>
            <button
              onClick={handleSave}
              className="bg-slate-900 text-white px-8 py-3 rounded-xl text-xs font-black uppercase hover:bg-slate-800 shadow-xl shadow-slate-200 active:scale-95 transition-all"
            >
              Save Resource
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}