'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Plus, Trash2, Save, Rocket,
  CheckSquare, Code, HelpCircle as QueryIcon
} from 'lucide-react';

interface QuestionBlock {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  questionText: string;
  points: number;
  options: string[]; // Used for Multiple Choice
  correctAnswer: string; // Key match text or index string
}

export default function LecturerAssessmentCreationStudio() {
  const params = useParams();
  const courseCode = (params?.courseCode as string)?.toUpperCase() || 'CSC-301';

  // State arrays for assessment criteria
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [assessmentType, setAssessmentType] = useState<'quiz' | 'exam'>('quiz');
  const [timeLimit, setTimeLimit] = useState(60); // minutes
  const [questions, setQuestions] = useState<QuestionBlock[]>([
    {
      id: 'q-1',
      type: 'multiple-choice',
      questionText: 'What is the runtime time complexity of an optimized matrix scaling function?',
      points: 10,
      options: ['O(1)', 'O(N)', 'O(N^2)', 'O(log N)'],
      correctAnswer: 'O(N^2)'
    }
  ]);

  // Handlers for dynamic question manipulation
  const addQuestion = (type: 'multiple-choice' | 'true-false' | 'short-answer') => {
    const newQuestion: QuestionBlock = {
      id: `q-${Date.now()}`,
      type,
      questionText: '',
      points: 5,
      options: type === 'multiple-choice' ? ['', '', '', ''] : type === 'true-false' ? ['True', 'False'] : [],
      correctAnswer: type === 'true-false' ? 'True' : ''
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestionText = (id: string, text: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, questionText: text } : q));
  };

  const updateOptionText = (qId: string, optIndex: number, text: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const updatedOptions = [...q.options];
        updatedOptions[optIndex] = text;
        return { ...q, options: updatedOptions };
      }
      return q;
    }));
  };

  const updateCorrectAnswer = (id: string, text: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, correctAnswer: text } : q));
  };

  const updatePoints = (id: string, value: number) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, points: value } : q));
  };

  const handlePublishAssessment = (status: 'draft' | 'live') => {
    if (!assessmentTitle.trim()) {
      alert('Please enter an assessment title before setting a deployment status.');
      return;
    }
    alert(`Assessment Matrix successfully compiled and saved as [${status.toUpperCase()}] for ${courseCode}. Total Questions: ${questions.length}`);
  };

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="space-y-6">
      
      {/* Header Framework Track */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <Link 
            href="/lecturer/courses" 
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors mb-2 group"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" /> Back to Course Dashboard
          </Link>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Assessment Authoring Studio</h1>
          <p className="text-xs font-medium text-slate-500">Draft raw quiz pools, write automated correct answers keys, and structure exam allocations for <span className="font-mono text-blue-900 font-bold">{courseCode}</span>.</p>
        </div>
      </div>

      {/* Grid Layout Canvas */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Core Meta Details and Question Builder */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Section: Assessment Meta Settings */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-2xs space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">1. Assessment Parameters</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider">Assessment Title</label>
                <input 
                  type="text" 
                  placeholder="e.g., Semester I Mid-Term Test, Quiz 3..." 
                  value={assessmentTitle}
                  onChange={(e) => setAssessmentTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-slate-300"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider">Assessment Classification</label>
                <select 
                  value={assessmentType}
                  onChange={(e) => setAssessmentType(e.target.value as 'quiz' | 'exam')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="quiz">Quiz Task (Continuous Assessment)</option>
                  <option value="exam">Final Examination Block</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider">Time Duration Limit (Minutes)</label>
                <input 
                  type="number" 
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider">Gradebook Allocation Layer</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none">
                  <option value="ca">Weight Against CA (Continuous Assessment)</option>
                  <option value="final">Weight Against Final Exam Mark</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Live Compiled Questions Workspace */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">2. Question Matrix Pool ({questions.length})</h3>
              <span className="text-[10px] font-mono font-black text-blue-900 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md uppercase">Sum Score: {totalPoints} Points</span>
            </div>

            {questions.map((q, index) => (
              <div key={q.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs space-y-4 relative group">
                
                {/* Question Descriptor Strip */}
                <div className="flex items-center justify-between border-b border-slate-50 pb-2 gap-4">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 bg-slate-950 text-white text-[10px] font-mono font-black rounded-md flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-[10px] font-mono font-black tracking-wider uppercase text-slate-400">
                      {q.type.replace('-', ' ')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Worth:</span>
                      <input 
                        type="number" 
                        value={q.points}
                        onChange={(e) => updatePoints(q.id, Number(e.target.value))}
                        className="w-12 bg-slate-50 border border-slate-200 text-center font-mono text-xs font-black p-1 rounded-lg outline-none"
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeQuestion(q.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg border border-transparent hover:border-slate-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Primary Prompt Input Text Area */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Target Question Prompt Text</label>
                  <textarea 
                    rows={2}
                    placeholder="Write your core question criteria here..."
                    value={q.questionText}
                    onChange={(e) => updateQuestionText(q.id, e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-slate-300 resize-none"
                  />
                </div>

                {/* Type Specific Configuration Fields */}
                {q.type === 'multiple-choice' && (
                  <div className="space-y-3 pt-1">
                    <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Multiple Choice Options Pool</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-2 bg-slate-50/60 border border-slate-200 rounded-xl px-3 py-1.5">
                          <span className="text-[10px] font-mono font-black text-slate-400 uppercase">{String.fromCharCode(65 + optIndex)}.</span>
                          <input 
                            type="text"
                            placeholder={`Option ${optIndex + 1}`}
                            value={opt}
                            onChange={(e) => updateOptionText(q.id, optIndex, e.target.value)}
                            className="bg-transparent text-xs font-semibold text-slate-700 outline-none w-full"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[10px] font-mono font-black text-emerald-600 uppercase tracking-wider">Exact Correct Evaluator Choice Match</label>
                      <select 
                        value={q.correctAnswer}
                        onChange={(e) => updateCorrectAnswer(q.id, e.target.value)}
                        className="w-full bg-emerald-50/40 border border-emerald-200/80 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 outline-none"
                      >
                        <option value="">-- Choose Target Selection Item --</option>
                        {q.options.map((opt, idx) => (
                          <option key={idx} value={opt}>{opt || `Option ${String.fromCharCode(65 + idx)} (Empty)`}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {q.type === 'true-false' && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono font-black text-emerald-600 uppercase tracking-wider">Correct System Evaluator Flag</label>
                    <select 
                      value={q.correctAnswer}
                      onChange={(e) => updateCorrectAnswer(q.id, e.target.value)}
                      className="w-full bg-emerald-50/40 border border-emerald-200/80 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 outline-none"
                    >
                      <option value="True">True</option>
                      <option value="False">False</option>
                    </select>
                  </div>
                )}

                {q.type === 'short-answer' && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono font-black text-emerald-600 uppercase tracking-wider">Automated Match Key Code Regex String</label>
                    <input 
                      type="text" 
                      placeholder="Input explicit solution keyword string (e.g., O(N^2) or matching function patterns)"
                      value={q.correctAnswer}
                      onChange={(e) => updateCorrectAnswer(q.id, e.target.value)}
                      className="w-full bg-emerald-50/40 border border-emerald-200/80 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-800 placeholder-emerald-600/40 outline-none"
                    />
                  </div>
                )}

              </div>
            ))}
          </div>

        </div>

        {/* Right 1 Column: Authoring Triggers Panel Toolbox */}
        <div className="space-y-6">
          
          {/* Question Type Injection Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">Add Question Blocks</h4>
            
            <button 
              type="button" 
              onClick={() => addQuestion('multiple-choice')}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left group"
            >
              <div className="flex items-center gap-2.5">
                <CheckSquare className="h-4 w-4 text-blue-900" />
                <span className="text-xs font-bold text-slate-800">Multiple Choice Matrix</span>
              </div>
              <Plus className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-900 transition-colors" />
            </button>

            <button 
              type="button" 
              onClick={() => addQuestion('true-false')}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left group"
            >
              <div className="flex items-center gap-2.5">
                <QueryIcon className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-800">True / False Boolean</span>
              </div>
              <Plus className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-900 transition-colors" />
            </button>

            <button 
              type="button" 
              onClick={() => addQuestion('short-answer')}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left group"
            >
              <div className="flex items-center gap-2.5">
                <Code className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">Short Answer / Solution Key</span>
              </div>
              <Plus className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-900 transition-colors" />
            </button>
          </div>

          {/* Deployment Trigger Canvas */}
          <div className="bg-slate-950 text-white rounded-2xl p-5 border border-slate-900 shadow-sm space-y-3.5">
            <div className="space-y-1">
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500">Deployment Pipeline</span>
              <h3 className="text-xs font-black uppercase text-white tracking-wider">Publish Control Track</h3>
              <p className="text-[11px] text-slate-400 font-medium leading-normal">
                Deploying live schedules this quiz configuration immediately onto student terminals. Ensure answer matching keys are finalized.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button 
                type="button"
                onClick={() => handlePublishAssessment('live')}
                className="w-full bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 border border-blue-800 shadow-md shadow-blue-950/40 transition-colors"
              >
                <Rocket className="h-4 w-4 text-amber-400" /> Push Assessment Live
              </button>
              
              <button 
                type="button"
                onClick={() => handlePublishAssessment('draft')}
                className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-800 transition-colors"
              >
                <Save className="h-4 w-4 text-slate-400" /> Save Structural Draft
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}