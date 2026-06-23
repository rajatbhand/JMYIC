'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { playAlongResponsesRef } from '@/lib/firebase';
import { gameStateManager } from '@/lib/gameState';
import type { GameState, PlayAlongResponse, PlayAlongDisplayEntry } from '@/lib/types';

interface PlayAlongPanelProps {
  gameState: GameState;
  onError: (msg: string) => void;
}

type Filter = 'all' | 'correct' | 'incorrect' | 'quickest' | 'slowest';

interface EnrichedResponse extends PlayAlongResponse {
  uid: string;
  isCorrect: boolean | null;
  responseTimeMs: number;
}

export default function PlayAlongPanel({ gameState, onError }: PlayAlongPanelProps) {
  const [responses, setResponses] = useState<EnrichedResponse[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const loadResponses = useCallback(async () => {
    if (!gameState.currentQuestion) {
      setResponses([]);
      return;
    }

    const questionId = gameState.currentQuestion.id;
    setLoading(true);
    try {
      // Write metadata doc to enable leaderboard correctAnswer lookup
      await setDoc(
        doc(db, 'playAlongAnswers', questionId),
        {
          correctAnswer: gameState.currentQuestion.guest_answer,
          questionText: gameState.currentQuestion.question,
          questionNumber: gameState.currentQuestionNumber
        },
        { merge: true }
      );

      const snap = await getDocs(playAlongResponsesRef(questionId));
      const startTime = gameState.currentQuestionStartTime ?? 0;
      const correctAnswer = gameState.currentQuestion.guest_answer;

      const enriched: EnrichedResponse[] = snap.docs.map((d) => {
        const data = d.data() as PlayAlongResponse;
        const responseTimeMs = startTime > 0 ? data.timestamp - startTime : 0;
        const isCorrect = gameState.currentQuestionAnswerRevealed
          ? data.answer === correctAnswer
          : null;
        return { ...data, uid: d.id, responseTimeMs, isCorrect };
      });

      // Default sort by response time ascending
      enriched.sort((a, b) => a.responseTimeMs - b.responseTimeMs);
      setResponses(enriched);
    } catch {
      onError('Failed to load Play Along responses.');
    } finally {
      setLoading(false);
    }
  }, [gameState.currentQuestion, gameState.currentQuestionAnswerRevealed, gameState.currentQuestionStartTime, gameState.currentQuestionNumber, onError]);

  useEffect(() => {
    loadResponses();
  }, [loadResponses]);

  const getFiltered = (): EnrichedResponse[] => {
    switch (filter) {
      case 'correct': return responses.filter(r => r.isCorrect === true);
      case 'incorrect': return responses.filter(r => r.isCorrect === false);
      case 'slowest': return [...responses].sort((a, b) => b.responseTimeMs - a.responseTimeMs);
      case 'quickest':
      case 'all':
      default: return responses;
    }
  };

  const toDisplayEntry = (r: EnrichedResponse): PlayAlongDisplayEntry => ({
    uid: r.uid,
    name: r.name,
    answer: r.answer,
    timestamp: r.timestamp,
    responseTimeMs: r.responseTimeMs
  });

  const pushDisplay = async (
    mode: GameState['playAlongDisplayMode'],
    entries: EnrichedResponse[]
  ) => {
    if (processing) return;
    setProcessing(true);
    try {
      await gameStateManager.updateGameState({
        playAlongDisplayMode: mode,
        playAlongDisplayEntries: entries.slice(0, 5).map(toDisplayEntry)
      });
    } catch {
      onError('Failed to update audience display.');
    } finally {
      setProcessing(false);
    }
  };

  const clearDisplay = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      await gameStateManager.updateGameState({
        playAlongDisplayMode: 'none',
        playAlongDisplayEntries: []
      });
    } catch {
      onError('Failed to clear audience display.');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = getFiltered();
  const quickest = responses.slice(0, 5);
  const slowest = [...responses].sort((a, b) => b.responseTimeMs - a.responseTimeMs).slice(0, 5);
  const correct = responses.filter(r => r.isCorrect === true);
  const incorrect = responses.filter(r => r.isCorrect === false);

  const currentMode = gameState.playAlongDisplayMode;

  return (
    <div className="bg-gray-800 rounded-lg p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-lg">Play Along</h2>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">{responses.length} responses</span>
          <button
            onClick={loadResponses}
            disabled={loading}
            className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600 disabled:opacity-50"
          >
            {loading ? '...' : 'Refresh'}
          </button>
        </div>
      </div>

      {!gameState.currentQuestion ? (
        <p className="text-gray-500 text-sm">No active question.</p>
      ) : (
        <>
          {/* Audience display toggles */}
          <div className="mb-4">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Show on Audience Screen</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => pushDisplay('quickest', quickest)}
                disabled={processing || quickest.length === 0}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors disabled:opacity-40 ${
                  currentMode === 'quickest' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Quickest ({quickest.length})
              </button>
              <button
                onClick={() => pushDisplay('slowest', slowest)}
                disabled={processing || slowest.length === 0}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors disabled:opacity-40 ${
                  currentMode === 'slowest' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Slowest ({slowest.length})
              </button>
              <button
                onClick={() => pushDisplay('correct', correct)}
                disabled={processing || correct.length === 0 || !gameState.currentQuestionAnswerRevealed}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors disabled:opacity-40 ${
                  currentMode === 'correct' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title={!gameState.currentQuestionAnswerRevealed ? 'Reveal answer first' : ''}
              >
                Correct ({correct.length})
              </button>
              <button
                onClick={() => pushDisplay('incorrect', incorrect)}
                disabled={processing || incorrect.length === 0 || !gameState.currentQuestionAnswerRevealed}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors disabled:opacity-40 ${
                  currentMode === 'incorrect' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title={!gameState.currentQuestionAnswerRevealed ? 'Reveal answer first' : ''}
              >
                Incorrect ({incorrect.length})
              </button>
              {currentMode !== 'none' && (
                <button
                  onClick={clearDisplay}
                  disabled={processing}
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-gray-600 text-white hover:bg-gray-500 disabled:opacity-40"
                >
                  Clear Display
                </button>
              )}
            </div>
          </div>

          {/* Filter buttons */}
          <div className="flex gap-2 mb-3">
            {(['all', 'correct', 'incorrect', 'quickest', 'slowest'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-1 rounded text-xs capitalize transition-colors ${
                  filter === f ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Response table */}
          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-gray-500 text-sm">
              {responses.length === 0 ? 'No responses yet.' : 'No responses match this filter.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs border-b border-gray-700">
                    <th className="text-left py-2 pr-3">#</th>
                    <th className="text-left py-2 pr-3">Name</th>
                    <th className="text-left py-2 pr-3">Answer</th>
                    <th className="text-left py-2 pr-3">Time</th>
                    {gameState.currentQuestionAnswerRevealed && (
                      <th className="text-left py-2">Correct?</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.uid} className="border-b border-gray-700/50">
                      <td className="py-1.5 pr-3 text-gray-500">{i + 1}</td>
                      <td className="py-1.5 pr-3 text-white">{r.name}</td>
                      <td className="py-1.5 pr-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                          r.isCorrect === true ? 'bg-green-700 text-white' :
                          r.isCorrect === false ? 'bg-red-700 text-white' :
                          'bg-yellow-700 text-white'
                        }`}>
                          {r.answer}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 text-gray-300 tabular-nums">
                        {r.responseTimeMs > 0 ? `${(r.responseTimeMs / 1000).toFixed(1)}s` : '—'}
                      </td>
                      {gameState.currentQuestionAnswerRevealed && (
                        <td className="py-1.5">
                          {r.isCorrect === true ? <span className="text-green-400">✓</span> :
                           r.isCorrect === false ? <span className="text-red-400">✗</span> :
                           <span className="text-gray-600">—</span>}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
