import { useCallback, useState } from 'react';
import type { ManualAdjustments } from '@/types';
import { DEFAULT_ADJUSTMENTS } from '@/utils/image';

export function useManualEditor(originalImageUrl: string | null) {
  const [history, setHistory] = useState<string[]>(originalImageUrl ? [originalImageUrl] : []);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [adjustments, setAdjustments] = useState<ManualAdjustments>(DEFAULT_ADJUSTMENTS);

  const current = history[historyIndex] || null;

  const setAdjustment = useCallback((key: keyof ManualAdjustments, value: number) => {
    setAdjustments((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetAdjustments = useCallback(() => setAdjustments(DEFAULT_ADJUSTMENTS), []);

  // Commit the current live preview as a new version in history (non-destructive)
  const commit = useCallback((previewUrl: string | null) => {
    if (!previewUrl) return;
    setHistory((prev) => {
      const truncated = prev.slice(0, historyIndex + 1); // drop forward history
      truncated.push(previewUrl);
      return truncated;
    });
    setHistoryIndex((i) => i + 1);
    resetAdjustments();
  }, [historyIndex, resetAdjustments]);

  const undo = useCallback(() => setHistoryIndex((i) => (i > 0 ? i - 1 : i)), []);
  const redo = useCallback(() =>
    setHistoryIndex((i) => (i < history.length - 1 ? i + 1 : i)),
    [history.length],
  );
  const reset = useCallback(() => {
    setHistoryIndex(0);
    setAdjustments(DEFAULT_ADJUSTMENTS);
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    originalImageUrl,
    current,
    adjustments,
    setAdjustment,
    resetAdjustments,
    commit,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  };
}
