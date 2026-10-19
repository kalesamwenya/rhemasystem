export type AssignmentAnnotation = {
  id: string;
  kind: 'highlight' | 'comment';
  quote: string;
  color?: 'yellow' | 'green' | 'blue';
  comment?: string;
  created_at: string;
  paragraph_index?: number;
  start_offset?: number;
  end_offset?: number;
};

export type AnnotatedTextSegment = {
  text: string;
  annotations: AssignmentAnnotation[];
};

export function assignmentTextParagraphs(content: string | null | undefined): string[] {
  const decoded = (content ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|li|blockquote|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'");
  return decoded.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

export function splitAnnotatedText(
  text: string,
  paragraphIndex: number,
  annotations: AssignmentAnnotation[],
): AnnotatedTextSegment[] {
  const ranges = annotations.flatMap((annotation) => {
    if (!annotation.quote) return [];
    const hasAnchor = annotation.paragraph_index === paragraphIndex
      && Number.isInteger(annotation.start_offset)
      && Number.isInteger(annotation.end_offset);
    const start = hasAnchor ? annotation.start_offset! : annotation.paragraph_index === undefined
      ? text.indexOf(annotation.quote)
      : -1;
    const end = hasAnchor ? annotation.end_offset! : start + annotation.quote.length;
    return start >= 0 && end > start && end <= text.length
      ? [{ annotation, start, end }]
      : [];
  });
  if (!ranges.length) return [{ text, annotations: [] }];

  const boundaries = Array.from(new Set([0, text.length, ...ranges.flatMap(({ start, end }) => [start, end])]))
    .sort((left, right) => left - right);
  return boundaries.slice(0, -1).flatMap((start, index) => {
    const end = boundaries[index + 1];
    if (end <= start) return [];
    return [{
      text: text.slice(start, end),
      annotations: ranges
        .filter((range) => range.start <= start && range.end >= end)
        .map((range) => range.annotation),
    }];
  });
}
