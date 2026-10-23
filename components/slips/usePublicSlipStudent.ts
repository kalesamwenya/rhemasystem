'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface PublicSlipStudent {
  student_id: string;
  name: string;
  email: string;
  class: string;
}

type LookupState = 'found' | 'not-found' | 'error';
type LookupResult = {
  studentId: string;
  state: LookupState;
  student: PublicSlipStudent | null;
  error: string;
};

export function usePublicSlipStudent(studentId: string, onStudentFound: (student: PublicSlipStudent) => void) {
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const id = studentId.trim();

  useEffect(() => {
    if (!id) return;

    let active = true;
    const timer = window.setTimeout(() => {
      api.attendance.publicSlipStudent(id)
        .then((response: { data?: PublicSlipStudent }) => {
          if (!active) return;
          if (!response.data?.student_id || !response.data.name) {
            throw new Error('The student lookup response was incomplete.');
          }
          onStudentFound(response.data);
          setLookup({ studentId: id, state: 'found', student: response.data, error: '' });
        })
        .catch((cause: unknown) => {
          if (!active) return;
          const notFound = cause instanceof Error && 'status' in cause && cause.status === 404;
          setLookup({
            studentId: id,
            state: notFound ? 'not-found' : 'error',
            student: null,
            error: notFound
              ? 'No active student record was found for this student number.'
              : cause instanceof Error ? cause.message : 'Unable to look up this student.',
          });
        });
    }, 400);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [id, onStudentFound]);

  const currentLookup = lookup?.studentId === id ? lookup : null;
  return {
    student: currentLookup?.student ?? null,
    state: !id ? 'idle' : currentLookup?.state ?? 'loading',
    error: currentLookup?.error ?? '',
  };
}
