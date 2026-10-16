'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Database, HelpCircle, Check, Eye } from 'lucide-react';

interface ConfiguredQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export default function LecturerEvaluationConfigurationPage() {
  const [courseCode, setCourseCode] = useState('CSC-301');
  const [evaluationTitle, setEvaluationTitle] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('45');
  const [evaluationType, setEvaluationType] = useState<'quiz' | 'exam_set_a'>('quiz');
  
  const [questions, setQuestions] = useState<ConfiguredQuestion[]>([
    {
      id: 1,
      question: "Sample Question Matrix Payload Description String?",
      options: ["Option Array Parameter Alpha", "Option Array Parameter Beta", "Option Array Parameter Gamma", "Option Array Parameter Delta"],
      correctIndex: 0,
      explanation: "Default tracking explanation text executed on student answer comparison hook."
    }
  ]);

  // Current Working State handles for single item composition
  const [newQuestionText, setNewQuestionText] = useState('');
  const [optionsArray, setOptionsArray] = useState<string[]>(['', '', '', '']);
  const [selectedCorrectIdx, setSelectedCorrectIdx] = useState<number>(0);
  const [newExplanationText, setNewExplanationText] = useState('');

  const handleUpdateOptionField = (index: number, numericalValue: string) => {
    setOptionsArray(prev => {
      const updated = [...prev];
      updated[index] = numericalValue;
      return updated;
    });
  };

  const handleAppendQuestionToRegistry = () => {
    if (!newQuestionText.trim() || optionsArray.some(opt => !opt.trim())) {
      alert("Validation Error: Complete all structural properties and text tracks.");
      return;
    }

    const newQuestion: ConfiguredQuestion = {
      id: questions.length + 1,
      question: newQuestionText,
      options: [...optionsArray],
      correctIndex: selectedCorrectIdx,
      explanation: newExplanationText
    };

    setQuestions(prev => [...prev, newQuestion]);
    setNewQuestionText('');
    setOptionsArray(['', '', '', '']);
    setSelectedCorrectIdx(0);
    setNewExplanationText('');
  };

  const handlePurgeQuestionElement = (id: number) => {
    setQuestions(prev => prev.filter(q => q.id !== id).map((q, idx) => ({ ...q, id: idx + 1 })));
  };

  const handleDeployToRegistryPipeline = () => {
    const deploymentPayload = {
      courseCode,
      evaluationTitle,
      timeLimitMinutes: Number(timeLimitMinutes),
      evaluationType,
      totalQuestionsCount: questions.length,
      questionsMatrix: questions
    };

    console.log("Pushing JSON blueprint payload directly into MySQL API endpoint: ", deploymentPayload);
    alert(`Success: System registered structure containing ${questions.length} auto-marked evaluation items.`);
  };

  return (
    <div className="py-6 space-y-6 px-4">
      <div>
        <div className="text-[10px] font-black uppercase tracking-widest text-blue-900 mb-1">Assessment Engine Core</div>
        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Auto-Marked Evaluation Designer</h1>
        <p className="text-xs font-medium text-slate-500 mt-0.5">Configure state keys, option vectors, and structural matrices loaded dynamically inside student dashboards.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        
        {/* Left Side Column: Configuration Properties Configuration */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Global Settings</h3>
            
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-mono font-bold text-slate-400 uppercase text-[10px]">Course Code</label>
                  <input type="text" value={courseCode} onChange={(e) => setCourseCode(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-mono text-xs focus:outline-none focus:border-slate-950 focus:bg-white" />
                </div>
                <div className="space-y-1">
                  <label className="font-mono font-bold text-slate-400 uppercase text-[10px]">Timer (Minutes)</label>
                  <input type="number" value={timeLimitMinutes} onChange={(e) => setTimeLimitMinutes(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-mono text-xs focus:outline-none focus:border-slate-950 focus:bg-white" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-mono font-bold text-slate-400 uppercase text-[10px]">Evaluation Module Context Target</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['quiz', 'exam_set_a'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEvaluationType(type)}
                      className={`p-2.5 font-mono text-[10px] uppercase font-bold tracking-tight rounded-xl border text-center transition-all ${
                        evaluationType === type ? 'bg-slate-950 text-white border-slate-950' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {type.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-mono font-bold text-slate-400 uppercase text-[10px]">Evaluation Title String</label>
                <input type="text" value={evaluationTitle} onChange={(e) => setEvaluationTitle(e.target.value)} placeholder="e.g., Core Theory Matrix Midterm" className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium focus:outline-none focus:border-slate-950 focus:bg-white" />
              </div>
            </div>
          </div>

          {/* Builder Element Canvas Component */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Inject Question parameters</h3>
            
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-mono font-bold text-slate-400 uppercase text-[10px]">Question Target Text</label>
                <textarea value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} placeholder="Analyze the runtime pipeline handling procedures under heavy packet transmission volumes..." className="w-full p-3 min-h-[70px] border border-slate-200 rounded-xl bg-slate-50 font-medium text-xs focus:outline-none focus:border-slate-950 focus:bg-white transition-all resize-none" />
              </div>

              <div className="space-y-1.5">
                <label className="font-mono font-bold text-slate-400 uppercase text-[10px]">Option Arrays & Correct Verification Target</label>
                <div className="space-y-2">
                  {optionsArray.map((option, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCorrectIdx(idx)}
                        className={`h-6 w-6 shrink-0 rounded-full font-mono text-[10px] font-black border flex items-center justify-center transition-all ${
                          selectedCorrectIdx === idx ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {selectedCorrectIdx === idx ? <Check className="h-3 w-3" /> : String.fromCharCode(65 + idx)}
                      </button>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleUpdateOptionField(idx, e.target.value)}
                        placeholder={`Option Vector tracking channel string ${String.fromCharCode(65 + idx)}`}
                        className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 text-xs focus:outline-none focus:border-slate-950 focus:bg-white transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <label className="font-mono font-bold text-slate-400 uppercase text-[10px]">Auto-Marking Explanation Log</label>
                <input type="text" value={newExplanationText} onChange={(e) => setNewExplanationText(e.target.value)} placeholder="Persistent duplex TCP sockets eliminate standard polling overhead..." className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-xs focus:outline-none focus:border-slate-950 focus:bg-white" />
              </div>

              <button
                type="button"
                onClick={handleAppendQuestionToRegistry}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider p-3 rounded-xl transition-all shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Append Question Vector
              </button>
            </div>
          </div>
        </div>

        {/* Right Side Column: Live Workspace Payload Preview */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400 font-bold uppercase">
                <Eye className="h-4 w-4" /> Live Registry Blueprint Matrix View ({questions.length})
              </div>
              <button
                type="button"
                disabled={questions.length === 0}
                onClick={handleDeployToRegistryPipeline}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-sm disabled:opacity-40"
              >
                <Database className="h-3.5 w-3.5 text-amber-400" /> Commit Registry Schema
              </button>
            </div>

            {questions.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-medium">
                No question units are configured within this active configuration pipeline container.
              </div>
            ) : (
              <div className="space-y-6 max-h-[640px] overflow-y-auto pr-1 divide-y divide-slate-100">
                {questions.map((q, index) => (
                  <div key={q.id} className={`space-y-3.5 ${index > 0 ? 'pt-5' : ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="text-xs font-bold text-slate-900 leading-relaxed">
                        <span className="font-mono text-blue-900 mr-1.5 uppercase">Blueprint Vector {q.id}:</span>
                        {q.question}
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePurgeQuestionElement(q.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((option, oIdx) => {
                        const isCorrect = q.correctIndex === oIdx;
                        return (
                          <div
                            key={oIdx}
                            className={`p-3 text-xs rounded-xl border font-medium flex items-center gap-2 ${
                              isCorrect ? 'bg-emerald-50/60 border-emerald-300 text-emerald-900 font-bold' : 'bg-slate-50/50 border-slate-200 text-slate-600'
                            }`}
                          >
                            <span className={`h-4 w-4 text-[9px] font-mono font-bold rounded-full flex items-center justify-center shrink-0 ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span className="truncate">{option}</span>
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="text-[10px] font-medium bg-slate-50 border border-slate-200/60 p-2.5 rounded-xl text-slate-500 flex gap-1.5 items-start font-mono">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span><strong className="text-slate-700">Explainer Block:</strong> {q.explanation}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}