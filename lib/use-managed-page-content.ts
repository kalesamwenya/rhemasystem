'use client';

import { useEffect, useState } from 'react';
import {
  loadManagedPageContent,
  type ManagedPageContent,
  type ManagedPageKey,
} from '@/lib/public-site-content';

export function useManagedPageContent(page: ManagedPageKey) {
  const [result, setResult] = useState<{
    page: ManagedPageKey | null;
    content: ManagedPageContent | null;
    error: string;
  }>({ page: null, content: null, error: '' });

  useEffect(() => {
    let active = true;
    loadManagedPageContent(page)
      .then((data) => {
        if (active) setResult({ page, content: data, error: '' });
      })
      .catch((loadError: unknown) => {
        if (active) {
          setResult({
            page,
            content: null,
            error: loadError instanceof Error ? loadError.message : `Unable to load ${page} page content.`,
          });
        }
      })
    return () => {
      active = false;
    };
  }, [page]);

  return result.page === page
    ? { content: result.content, error: result.error, isLoading: false }
    : { content: null, error: '', isLoading: true };
}
