'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, CloudUpload, FileCode, FileText,
  Globe, X, CheckCircle2, AlertCircle
} from 'lucide-react';

interface SelectedFilePayload {
  name: string;
  size: string;
  typeGroup: 'code' | 'document' | 'video' | 'link';
  rawFile?: File;
}

export default function LecturerResourceUploadSystem() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form State Matrix
  const [courseCode, setCourseCode] = useState('CSC-301');
  const [assetTitle, setAssetTitle] = useState('');
  const [resourceType, setResourceType] = useState<'code' | 'document' | 'video' | 'link'>('document');
  const [externalUrl, setExternalUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [selectedFile, setSelectedFile] = useState<SelectedFilePayload | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Helper calculation to parse file sizes into clean strings
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Process raw inbound file allocations
  const processFile = (file: File) => {
    // Map MIME types to our platform classification vectors
    let group: 'code' | 'document' | 'video' | 'link' = 'document';
    if (file.name.endsWith('.js') || file.name.endsWith('.tsx') || file.name.endsWith('.php') || file.name.endsWith('.sql') || file.name.endsWith('.zip')) {
      group = 'code';
    } else if (file.type.startsWith('video/')) {
      group = 'video';
    }

    setSelectedFile({
      name: file.name,
      size: formatBytes(file.size),
      typeGroup: group,
      rawFile: file
    });
    setResourceType(group);
    if (!assetTitle) {
      // Auto-populate asset title field with file name strip text minus extension for speed
      setAssetTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  // Drag and Drop Event Rail Hooks
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  // Form Dispatch Simulation Pipeline
  const handleExecuteUpload = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (resourceType !== 'link' && !selectedFile) {
      alert('Please select a local system file or drop a resource payload to proceed.');
      return;
    }
    if (resourceType === 'link' && !externalUrl.trim()) {
      alert('Please enter a target URL for this external link resource.');
      return;
    }
    if (!assetTitle.trim()) {
      alert('Please specify a recognizable display title for the asset registry.');
      return;
    }

    // Trigger visual loading simulation
    let progress = 0;
    setUploadProgress(0);
    const interval = setInterval(() => {
      progress += 25;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          alert(`Asset payload [${assetTitle}] compiled and written successfully to ${courseCode} network arrays.`);
          router.push('/lecture/resources');
        }, 400);
      }
    }, 200);
  };

  return (
    <div className="space-y-6 mx-auto">
      
      {/* Navigation Backstrip Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <Link 
            href="/lecture/resources" 
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors mb-2 group"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" /> Back to Resources Repository
          </Link>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Ingest Resource Payload</h1>
          <p className="text-xs font-medium text-slate-500">Stage raw assets, sample code directories, or video records onto cloud file allocations.</p>
        </div>
      </div>

      {/* Main Structural Twin Panel Form Engine */}
      <form onSubmit={handleExecuteUpload} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Two Columns: Upload Targets and Intake Fields */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* File Intake Drag Block Canvas */}
          {resourceType !== 'link' && (
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] bg-white group ${
                isDragging 
                  ? 'border-blue-900 bg-blue-50/30' 
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                onChange={handleFileSelect}
              />

              {!selectedFile ? (
                <div className="space-y-3">
                  <div className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mx-auto group-hover:scale-105 group-hover:text-slate-900 transition-all shadow-3xs">
                    <CloudUpload className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Drag & drop your resource file here, or <span className="text-blue-900 underline">browse storage</span></p>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">Accepts ZIP, source scripts, PDF, DOCX, MP4 up to 500MB</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 w-full max-w-md">
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 text-left relative group-hover:bg-white transition-all">
                    <div className="h-9 w-9 rounded-lg bg-blue-900/10 text-blue-900 flex items-center justify-center shrink-0">
                      {selectedFile.typeGroup === 'code' ? <FileCode className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    </div>
                    <div className="truncate pr-6">
                      <p className="text-xs font-bold text-slate-900 truncate">{selectedFile.name}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">{selectedFile.size}</p>
                    </div>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="absolute right-2 top-2 p-1 rounded-md text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">Click anywhere inside the zone box to substitute this selection container</p>
                </div>
              )}
            </div>
          )}

          {/* Primary Asset Parameter Settings Metadata Block */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Resource Attributes</h3>

            {/* Title Block Input Row */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider">Display Title Anchor</label>
              <input 
                type="text" 
                placeholder="e.g., Lecture 04: Relational Normalization Paradigms..." 
                value={assetTitle}
                onChange={(e) => setAssetTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-slate-300"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Syllabus Context Mapping Node */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider">Target Syllabus Track Mapping</label>
                <select 
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-slate-300"
                >
                  <option value="CSC-301">CSC-301 System Architecture</option>
                  <option value="CSC-305">CSC-305 Web Engineering</option>
                </select>
              </div>

              {/* Explicit Modality Variant Core Setter */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider">Asset Modality Classification</label>
                <select 
                  value={resourceType}
                  onChange={(e) => {
                    const nextResourceType = e.target.value as 'code' | 'document' | 'video' | 'link';
                    setResourceType(nextResourceType);
                    if (nextResourceType !== 'link') setExternalUrl('');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-slate-300"
                >
                  <option value="document">Document Asset (PDF, Slide Deck, Sheet)</option>
                  <option value="code">Code Repository File Stack (ZIP, Script)</option>
                  <option value="video">Instructional Recorded Session (MP4)</option>
                  <option value="link">External Resource Link Pointer (URL)</option>
                </select>
              </div>
            </div>

            {/* Conditional Sub-input for External Hyperlinks */}
            {resourceType === 'link' && (
              <div className="space-y-1.5 pt-2 animate-in fade-in slide-in-from-top-2 duration-150">
                <label className="block text-[10px] font-mono font-black text-emerald-600 uppercase tracking-wider">Target External Resource URL Reference</label>
                <div className="flex items-center gap-2 bg-emerald-50/40 border border-emerald-200/60 px-3 py-2 rounded-xl">
                  <Globe className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <input 
                    type="url" 
                    placeholder="https://github.com/your-repository-link or target video portal" 
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    className="bg-transparent font-mono text-xs text-emerald-800 placeholder-emerald-600/40 outline-none w-full font-bold"
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right One Column: Context Registry Strategy and Submission Control */}
        <div className="space-y-6">
          
          {/* Visibility and Save Dispatch Matrix Card */}
          <div className="bg-slate-950 text-white p-5 rounded-2xl border border-slate-900 shadow-md space-y-4">
            <div className="space-y-1">
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500">Registry System Control</span>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Publish Directives</h3>
            </div>

            {/* Visibility Toggle Switch Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold">Deploy Instantly Live</span>
                <input 
                  type="checkbox" 
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 accent-blue-900 rounded cursor-pointer"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-normal">
                If checked, students assigned to <span className="font-mono text-amber-400 font-bold">{courseCode}</span> will receive immediate notification alerts on their terminal screens.
              </p>
            </div>

            {/* Active Running Progress Tracker Layout */}
            {uploadProgress !== null && (
              <div className="space-y-1.5 pt-1 font-mono">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                  <span>Pushing Buffer Packet...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <button 
              type="submit"
              disabled={uploadProgress !== null}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 border border-blue-800 shadow-md shadow-blue-950/40 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4 text-amber-400" /> Confirm Registry Write
            </button>
          </div>

          {/* Operational Advisory Notes Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <AlertCircle className="h-3.5 w-3.5 text-slate-500" />
              <h4 className="text-[10px] font-mono font-black uppercase text-slate-900">System File Guidelines</h4>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              When committing compressed code architecture assets (e.g., structural homework templates or full framework solution zip structures), verify that all execution vendor pathways (<code className="bg-slate-50 text-[10px] px-1 py-0.5 rounded border border-slate-100">node_modules</code> or localized project binary logs) are scrubbed to optimize active storage allocation paths.
            </p>
          </div>

        </div>

      </form>
    </div>
  );
}