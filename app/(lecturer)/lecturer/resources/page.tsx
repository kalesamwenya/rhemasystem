'use client';

import React, { useState, useRef } from 'react';
import { confirmWithApp } from '@/components/ui/app-dialogs';
import {
  FileCode, FileText, Video, Globe,
  Trash2, Eye, EyeOff, Search, HardDrive,
  CloudUpload, Layers, X, CheckCircle2
} from 'lucide-react';

interface ResourceAsset {
  id: string;
  title: string;
  type: 'code' | 'document' | 'video' | 'link';
  courseCode: string;
  fileSize?: string;
  uploadedAt: string;
  isPublic: boolean;
}

interface SelectedFilePayload {
  name: string;
  size: string;
  typeGroup: 'code' | 'document' | 'video' | 'link';
  rawFile?: File;
}

export default function LecturerAdvancedResourcesPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // App States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Inbound Modal Upload Form States
  const [formCourseCode, setFormCourseCode] = useState('CSC-301');
  const [formAssetTitle, setFormAssetTitle] = useState('');
  const [formResourceType, setFormResourceType] = useState<'code' | 'document' | 'video' | 'link'>('document');
  const [formExternalUrl, setFormExternalUrl] = useState('');
  const [formIsPublic, setFormIsPublic] = useState(true);
  const [selectedFile, setSelectedFile] = useState<SelectedFilePayload | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Hardcoded repository simulation records
  const [resources, setResources] = useState<ResourceAsset[]>([
    { id: 'res-1', title: 'Logic Gates Matrix Optimization Algorithms (C++ / Node.js)', type: 'code', courseCode: 'CSC-301', fileSize: '4.2 MB', uploadedAt: 'Today, 10:14 CAT', isPublic: true },
    { id: 'res-2', title: 'Syllabus Core Breakdown Semester I', type: 'document', courseCode: 'CSC-301', fileSize: '1.8 MB', uploadedAt: '12 May, 2026', isPublic: true },
    { id: 'res-3', title: 'Next.js App Router & Middleware Authentication Architecture', type: 'code', courseCode: 'CSC-305', fileSize: '12.4 MB', uploadedAt: '28 May, 2026', isPublic: false },
    { id: 'res-4', title: 'Persistent Data Streams Complete Video Session 01', type: 'video', courseCode: 'CSC-305', fileSize: '148.0 MB', uploadedAt: '24 May, 2026', isPublic: true },
  ]);

  // Helper calculation to parse file sizes into clean strings
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Toggle dynamic visibility pipeline for student nodes
  const toggleVisibility = (id: string) => {
    setResources(resources.map(res => 
      res.id === id ? { ...res, isPublic: !res.isPublic } : res
    ));
  };

  const deleteResource = async (id: string) => {
    if (await confirmWithApp('Are you sure you want to permanently purge this asset from the cluster file systems?', { title: 'Delete resource?', confirmText: 'Delete', tone: 'danger' })) {
      setResources(resources.filter(res => res.id !== id));
    }
  };

  // File Intake Drag & Drop Handlers
  const processFile = (file: File) => {
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
    setFormResourceType(group);
    if (!formAssetTitle) {
      setFormAssetTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
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

  // Form Dispatch Pipeline Execution
  const handleExecuteUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (formResourceType !== 'link' && !selectedFile) {
      alert('Please select a local system file or drop a resource payload to proceed.');
      return;
    }
    if (formResourceType === 'link' && !formExternalUrl.trim()) {
      alert('Please enter a target URL for this external link resource.');
      return;
    }
    if (!formAssetTitle.trim()) {
      alert('Please specify a recognizable display title for the asset registry.');
      return;
    }

    let progress = 0;
    setUploadProgress(0);
    const interval = setInterval(() => {
      progress += 25;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          // Append new file mock payload directly into running state tree
          const newAsset: ResourceAsset = {
            id: `res-${Date.now()}`,
            title: formAssetTitle,
            type: formResourceType,
            courseCode: formCourseCode,
            fileSize: formResourceType === 'link' ? undefined : selectedFile?.size,
            uploadedAt: 'Just now',
            isPublic: formIsPublic
          };

          setResources([newAsset, ...resources]);
          
          // Clear internal modal states
          setFormAssetTitle('');
          setFormExternalUrl('');
          setSelectedFile(null);
          setUploadProgress(null);
          setIsUploadOpen(false);
        }, 300);
      }
    }, 150);
  };

  const filteredResources = resources.filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(searchQuery.toLowerCase()) || res.courseCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = selectedCourse === 'all' || res.courseCode === selectedCourse;
    return matchesSearch && matchesCourse;
  });

  return (
    <div className="space-y-6 relative">
      
      {/* Structural Header Grid */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="text-[10px] font-mono font-black uppercase tracking-widest text-blue-900 mb-1">Asset Control Engine</div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Advanced Resources Repository</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Deploy companion code repositories, lecture materials, stream links, and manage file architecture trees.</p>
        </div>

        <button 
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-mono font-black uppercase tracking-wider text-white bg-blue-900 hover:bg-blue-800 border border-blue-800 px-4 py-2 rounded-xl shadow-sm transition-colors"
        >
          <CloudUpload className="h-4 w-4 text-amber-400" /> Upload Asset Payload
        </button>
      </div>

      {/* Analytics and Space Allocation Rails */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Drive Storage Tracking Meter */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs flex items-center justify-between gap-4">
          <div className="space-y-1 w-full">
            <span className="block text-[9px] font-mono font-black text-slate-400 uppercase tracking-wider">Storage Volume Quota</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-mono font-black text-slate-900">166.4 MB</span>
              <span className="text-[10px] font-mono font-bold text-slate-400">of 2.0 GB Used</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
              <div className="bg-blue-900 h-full rounded-full" style={{ width: '8.3%' }} />
            </div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
            <HardDrive className="h-4 w-4 text-slate-600" />
          </div>
        </div>

        {/* Quantified Resource Blocks */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="block text-[9px] font-mono font-black text-slate-400 uppercase tracking-wider">Tracked Asset Nodes</span>
            <span className="block text-xl font-mono font-black text-slate-900">{resources.length} System Files</span>
            <span className="block text-[10px] font-medium text-slate-500">Distributed across allocations</span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center shrink-0">
            <Layers className="h-4 w-4" />
          </div>
        </div>

        {/* Visibility Safety Counter */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="block text-[9px] font-mono font-black text-slate-400 uppercase tracking-wider">Hidden Stash Blocks</span>
            <span className="block text-xl font-mono font-black text-slate-900">
              {resources.filter(r => !r.isPublic).length} Drafting Artifacts
            </span>
            <span className="block text-[10px] font-medium text-slate-500">Invisible to undergraduate terminals</span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <EyeOff className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Query Filters Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-full sm:w-80">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search material titles or properties..." 
            className="bg-transparent text-xs outline-none w-full text-slate-800 placeholder-slate-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">Module Filter:</span>
          <select 
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-slate-300"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <option value="all">All Repositories</option>
            <option value="CSC-301">CSC-301 System Architecture</option>
            <option value="CSC-305">CSC-305 Web Engineering</option>
          </select>
        </div>
      </div>

      {/* Main Structural File Asset Matrix Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Resource Node Title</th>
                <th className="py-3 px-4">Syllabus Track</th>
                <th className="py-3 px-4">Allocated Payload Weight</th>
                <th className="py-3 px-4">Upload Timestamp</th>
                <th className="py-3 px-4">Terminal Visibility State</th>
                <th className="py-3 px-4 text-right">Execution Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {filteredResources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 font-bold font-sans">No digital resources matching parameter sets found inside directory fields.</td>
                </tr>
              ) : (
                filteredResources.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-50/40 transition-colors group">
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg border border-slate-100 flex items-center justify-center bg-slate-50 shadow-3xs shrink-0">
                          {asset.type === 'code' && <FileCode className="h-4 w-4 text-blue-600" />}
                          {asset.type === 'document' && <FileText className="h-4 w-4 text-amber-500" />}
                          {asset.type === 'video' && <Video className="h-4 w-4 text-purple-600" />}
                          {asset.type === 'link' && <Globe className="h-4 w-4 text-emerald-600" />}
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-slate-900 leading-tight truncate">{asset.title}</p>
                          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wide mt-0.5">{asset.type} storage container</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-black text-blue-900">{asset.courseCode}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 font-bold">{asset.fileSize || '--'}</td>
                    <td className="py-3.5 px-4 text-slate-500">{asset.uploadedAt}</td>
                    <td className="py-3.5 px-4">
                      <button 
                        type="button"
                        onClick={() => toggleVisibility(asset.id)}
                        className={`inline-flex items-center gap-1.5 text-[9px] font-mono font-black uppercase px-2 py-1 rounded-md border tracking-wider transition-all ${
                          asset.isPublic 
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-100 hover:bg-emerald-100' 
                            : 'text-amber-700 bg-amber-50 border-amber-100 hover:bg-amber-100'
                        }`}
                      >
                        {asset.isPublic ? (
                          <> <Eye className="h-3 w-3" /> Published to Terminals </>
                        ) : (
                          <> <EyeOff className="h-3 w-3" /> Stashed / Invisible </>
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          type="button"
                          onClick={() => deleteResource(asset.id)}
                          className="h-7 w-7 text-slate-400 hover:text-rose-600 border border-transparent hover:border-slate-100 hover:bg-white rounded-lg flex items-center justify-center transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Action Drawer Modal (Drag/Drop Intake Component Built In) */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-3xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white h-full border-l border-slate-200 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200 p-6 space-y-6 overflow-y-auto">
            
            {/* Modal Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Ingest Resource Payload</h2>
                <p className="text-[11px] text-slate-500 font-medium">Stage material files directly into running storage allocations.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsUploadOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 border border-slate-100 rounded-xl transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Inbound Form Engine Body */}
            <form onSubmit={handleExecuteUpload} className="flex-1 space-y-5 text-xs">
              
              {/* Dynamic Dropzone Area wrapper */}
              {formResourceType !== 'link' && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
                    isDragging ? 'border-blue-900 bg-blue-50/20' : 'border-slate-200 hover:bg-slate-50/50'
                  }`}
                >
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                  {!selectedFile ? (
                    <div className="space-y-2">
                      <CloudUpload className="h-5 w-5 text-slate-400 mx-auto" />
                      <p className="font-bold text-slate-700">Drag file here, or <span className="text-blue-900 underline">browse</span></p>
                      <p className="text-[9px] text-slate-400 font-mono">ZIP, PDFs, DOCX, MP4 up to 500MB</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-left w-full max-w-sm relative">
                      <div className="h-7 w-7 rounded bg-blue-900/10 text-blue-900 flex items-center justify-center shrink-0">
                        {selectedFile.typeGroup === 'code' ? <FileCode className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                      </div>
                      <div className="truncate pr-4">
                        <p className="font-bold text-slate-900 truncate text-[11px]">{selectedFile.name}</p>
                        <p className="text-[9px] font-mono text-slate-400">{selectedFile.size}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Display Title Anchor */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider">Display Title Anchor</label>
                <input 
                  type="text" 
                  placeholder="e.g., Extended Lab Solution Template" 
                  value={formAssetTitle}
                  onChange={(e) => setFormAssetTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none"
                />
              </div>

              {/* Allocation Syllabus Target */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider">Target Syllabus Track Mapping</label>
                <select 
                  value={formCourseCode}
                  onChange={(e) => setFormCourseCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="CSC-301">CSC-301 System Architecture</option>
                  <option value="CSC-305">CSC-305 Web Engineering</option>
                </select>
              </div>

              {/* Modality Selector Class */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider">Asset Modality Classification</label>
                <select 
                  value={formResourceType}
                  onChange={(e) => {
                    const nextResourceType = e.target.value as 'code' | 'document' | 'video' | 'link';
                    setFormResourceType(nextResourceType);
                    if (nextResourceType !== 'link') setFormExternalUrl('');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="document">Document Asset (PDF, Slide Deck)</option>
                  <option value="code">Code Repository File Stack (ZIP, Script)</option>
                  <option value="video">Instructional Recorded Session (MP4)</option>
                  <option value="link">External Resource Link Pointer (URL)</option>
                </select>
              </div>

              {/* Conditionally Render External Link Input Fields */}
              {formResourceType === 'link' && (
                <div className="space-y-1.5 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <label className="block text-[10px] font-mono font-black text-emerald-600 uppercase tracking-wider">Target External Resource URL Reference</label>
                  <input 
                    type="url" 
                    placeholder="https://github.com/example-repo" 
                    value={formExternalUrl}
                    onChange={(e) => setFormExternalUrl(e.target.value)}
                    className="w-full bg-emerald-50/50 border border-emerald-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-800 placeholder-emerald-600/40 outline-none"
                  />
                </div>
              )}

              {/* Direct Terminal Visibility Toggle Checkbox */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-3 mt-4">
                <input 
                  type="checkbox" 
                  id="drawer-visibility-toggle"
                  checked={formIsPublic}
                  onChange={(e) => setFormIsPublic(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-blue-900 rounded cursor-pointer"
                />
                <label htmlFor="drawer-visibility-toggle" className="space-y-0.5 cursor-pointer">
                  <span className="block font-bold text-slate-800">Deploy Instantly Live</span>
                  <span className="block text-[10px] text-slate-500 font-medium leading-normal">
                    Makes this payload immediately visible on authorized undergraduate terminals.
                  </span>
                </label>
              </div>

              {/* Interactive Progressive Buffer Element */}
              {uploadProgress !== null && (
                <div className="space-y-1.5 font-mono pt-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                    <span>Pushing Data Payload...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div className="bg-blue-950 h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              {/* Form Action Controls Footer Sticky Bar */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button 
                  type="button" 
                  disabled={uploadProgress !== null}
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Dismiss
                </button>
                <button 
                  type="submit" 
                  disabled={uploadProgress !== null}
                  className="bg-blue-900 hover:bg-blue-800 text-white font-mono font-black uppercase tracking-wider px-4 py-2 rounded-xl inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> Confirm Write
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}