'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Clock, MapPin, Users, 
  Search, Plus, AlertCircle, BookOpen
} from 'lucide-react';
import { requestRhemaSchedules } from '@/lib/rhema-schedule-api';

// --- MOCK ACADEMIC ROSTER & SCHEDULE MATRIX ---
const mockScheduleData = {
  currentSemester: "Semester I - 2026",
  daysMatrix: [
    { key: 'mon', label: 'Mon', date: '25 May' },
    { key: 'tue', label: 'Tue', date: '26 May' },
    { key: 'wed', label: 'Wed', date: '27 May' },
    { key: 'thu', label: 'Thu', date: '28 May' },
    { key: 'fri', label: 'Fri', date: '29 May' },
  ],
  slots: [
    {
      id: 'SCH-102',
      courseCode: 'ICT-1010',
      courseName: 'Introduction to Software Architecture',
      instructor: 'Dr. Chileshe Mulenga',
      timeStart: '08:00',
      timeEnd: '10:30',
      day: 'mon',
      venue: 'Syllabus Lab 3A',
      enrolledStudents: 114,
      status: 'Completed',
      type: 'Lecture'
    },
    {
      id: 'SCH-105',
      courseCode: 'ICT-1010',
      courseName: 'Introduction to Software Architecture',
      instructor: 'Dr. Chileshe Mulenga',
      timeStart: '11:00',
      timeEnd: '13:00',
      day: 'wed',
      venue: 'Syllabus Lab 3A',
      enrolledStudents: 114,
      status: 'Ongoing', // Highlighted active system state
      type: 'Practical Lab'
    },
    {
      id: 'SCH-204',
      courseCode: 'NET-2101',
      courseName: 'Advanced Distributed Networks',
      instructor: 'Prof. Godfrey Mwamba',
      timeStart: '14:00',
      timeEnd: '16:30',
      day: 'wed',
      venue: 'Main Engineering Block Theatre',
      enrolledStudents: 68,
      status: 'Upcoming',
      type: 'Lecture'
    },
    {
      id: 'SCH-301',
      courseCode: 'SEC-3200',
      courseName: 'Cryptographic Protocols & Cyber Audit',
      instructor: 'Mrs. Mutale Kabwe',
      timeStart: '09:00',
      timeEnd: '11:30',
      day: 'thu',
      venue: 'Virtual Room Beta',
      enrolledStudents: 45,
      status: 'Conflict Warning', // Smart infrastructure indicator
      type: 'Seminar'
    },
    {
      id: 'SCH-112',
      courseCode: 'ICT-1010',
      courseName: 'Introduction to Software Architecture',
      instructor: 'Dr. Chileshe Mulenga',
      timeStart: '14:00',
      timeEnd: '16:00',
      day: 'fri',
      venue: 'Syllabus Lab 3A',
      enrolledStudents: 114,
      status: 'Upcoming',
      type: 'Peer Review Workshop'
    }
  ]
};

type ScheduleSlot = {
  id: string;
  courseCode: string;
  courseName: string;
  instructor: string;
  timeStart: string;
  timeEnd: string;
  day: string;
  venue: string;
  enrolledStudents: number;
  status: string;
  type: string;
};

export default function AcademicClassScheduleHub() {
  const [activeDay, setActiveDay] = useState('wed'); // Defaulting to dynamic active view
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>(mockScheduleData.slots);

  useEffect(() => {
    requestRhemaSchedules().then(({ schedules, enrollments }) => {
      const slots = schedules.flatMap((schedule) => schedule.sessions.map((session) => {
        const sessionDate = new Date(`${session.date}T${session.start}`);
        return {
          id: session.id,
          courseCode: schedule.course,
          courseName: schedule.course,
          instructor: 'Academic Registry',
          timeStart: session.start,
          timeEnd: session.end,
          day: sessionDate.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase(),
          venue: session.notes || 'Academic venue pending',
          enrolledStudents: enrollments[schedule.id]?.length ?? 0,
          status: sessionDate.getTime() < Date.now() ? 'Completed' : 'Upcoming',
          type: 'Lecture',
        };
      }));
      if (slots.length) setScheduleSlots(slots);
    }).catch(() => undefined);
  }, []);

  // Filter pipeline
  const filteredSlots = scheduleSlots.filter(slot => {
    const matchesDay = slot.day === activeDay;
    const matchesType = typeFilter === 'All' || slot.type === typeFilter;
    const matchesSearch = 
      slot.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      slot.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      slot.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      slot.venue.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesDay && matchesType && matchesSearch;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-slate-100 text-slate-500 border-slate-200/60';
      case 'Ongoing':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse';
      case 'Conflict Warning':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200/80';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Dynamic Nav Header Row */}
      <div className="flex flex-col gap-3 pb-4 border-b border-slate-200/80 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link 
            href="/admin/dashboard" 
            className="inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all active:scale-95 shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <span>Academic Core</span>
              <span>/</span>
              <span className="text-slate-600">Syllabus Master Timetable</span>
            </div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase sm:text-xl mt-0.5">
              Class Roster & Schedule Hub
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-2xs cursor-pointer">
            <Plus className="h-3.5 w-3.5" /> Allocate Session Slot
          </button>
        </div>
      </div>

      {/* Interactive Academic Calendar Strip Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-2xs flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center px-2">
          <span className="text-xs font-black uppercase text-slate-400 tracking-wider whitespace-nowrap">
            {mockScheduleData.currentSemester}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          {mockScheduleData.daysMatrix.map((day) => {
            const isSelected = activeDay === day.key;
            return (
              <button
                key={day.key}
                onClick={() => setActiveDay(day.key)}
                className={`flex flex-col items-center justify-center py-2 px-4 rounded-xl min-w-[64px] transition-all cursor-pointer border ${
                  isSelected 
                    ? 'bg-slate-900 border-slate-900 text-white font-bold shadow-xs scale-102' 
                    : 'bg-white border-slate-100 hover:border-slate-200 text-slate-600'
                }`}
              >
                <span className={`text-[10px] uppercase font-black tracking-wider ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                  {day.label}
                </span>
                <span className="text-xs font-mono font-bold mt-0.5">
                  {day.date.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Matrix Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by course code, room venue, or instructor assignment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 bg-slate-50/40 rounded-xl focus:outline-hidden focus:border-slate-400 focus:bg-white font-medium transition-all"
          />
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:border-slate-400"
          >
            <option value="All">All Instruction Types</option>
            <option value="Lecture">Standard Lecture</option>
            <option value="Practical Lab">Practical Lab</option>
            <option value="Seminar">Seminar</option>
          </select>
        </div>
      </div>

      {/* Dynamic Session Slots Stream Container */}
      <div className="space-y-4">
        {filteredSlots.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-3xs">
            <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-3" />
            <p className="text-xs font-black uppercase tracking-wider text-slate-800">No Allocation Data Available</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">There are no academic classes structured or matching criteria for this timeline segment.</p>
          </div>
        ) : (
          filteredSlots.map((slot) => {
            const isOngoing = slot.status === 'Ongoing';
            const isConflict = slot.status === 'Conflict Warning';

            return (
              <div 
                key={slot.id} 
                className={`bg-white border rounded-2xl p-4 shadow-2xs transition-all hover:border-slate-300 relative overflow-hidden flex flex-col gap-4 md:flex-row md:items-center md:justify-between group ${
                  isOngoing ? 'border-emerald-500/60 ring-1 ring-emerald-500/10' : 'border-slate-200'
                }`}
              >
                {/* Micro Sidebar Anchor for Continuous Time Mapping */}
                <div className="flex items-start gap-4 md:items-center">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl p-2.5 min-w-[105px] justify-center font-mono text-xs font-bold text-slate-900 shadow-3xs">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>{slot.timeStart} - {slot.timeEnd}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-xs text-slate-900 tracking-wider">
                        {slot.courseCode}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${getStatusStyle(slot.status)}`}>
                        {slot.status}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded">
                        {slot.type}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-slate-800 tracking-tight mt-1 group-hover:text-slate-900 transition-colors">
                      {slot.courseName}
                    </h3>
                    
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Assigned Lead: <span className="text-slate-600 font-semibold">{slot.instructor}</span>
                    </p>
                  </div>
                </div>

                {/* Metadata Operations Metrics Stack */}
                <div className="flex items-center gap-4 flex-wrap border-t border-slate-100 pt-3 md:border-0 md:pt-0 justify-between md:justify-end">
                  <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{slot.venue}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      <span>{slot.enrolledStudents} Enrolled</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isConflict ? (
                      <div className="flex items-center gap-1 text-[11px] font-bold text-rose-600 px-2 py-1 bg-rose-50 rounded-xl border border-rose-100">
                        <AlertCircle className="h-3 w-3" /> Double Booking Collision
                      </div>
                    ) : (
                      <Link
                        href={`/admin/courses/${slot.courseCode.toLowerCase()}`}
                        className="inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 text-xs font-bold transition-all shadow-3xs"
                      >
                        Syllabus Folder
                      </Link>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}