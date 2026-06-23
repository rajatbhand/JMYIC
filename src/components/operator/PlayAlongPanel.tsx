'use client';

import { useState, useEffect } from 'react';
import { onValue, set } from 'firebase/database';
import { collection, getDocs } from 'firebase/firestore';
import { db, playAlongAnswersByQNumRef, playAlongQuestionMetaRtdbRef } from '@/lib/firebase';
import { gameStateManager } from '@/lib/gameState';
import { GameLogic } from '@/utils/gameLogic';
import type { GameState, PlayAlongDisplayEntry } from '@/lib/types';

interface PlayAlongPanelProps {
  gameState: GameState;
  onError: (msg: string) => void;
}

type Filter = 'all' | 'correct' | 'incorrect' | 'quickest' | 'slowest';

interface ResponseRow {
  uid: string;
  name: string;
  answer: string;
  timestamp: number;
  responseTimeMs: number;
  isCorrect: boolean | null;
}

export default function PlayAlongPanel({ gameState, onError }: PlayAlongPanelProps) {
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [processing, setProcessing] = useState(false);

  const questionNumber = gameState.currentQuestionNumber;
  const question = gameState.currentQuestion;

  // Fetch participant count from Firestore (not real-time, just a count)
  useEffect(() => {
    getDocs(collection(db, 'playAlongUsers'))
      .then(snap => setParticipantCount(snap.size))
      .catch(() => {});
  }, []);

  // Write question metadata to RTDB so leaderboard can display it for past questions
  useEffect(() => {
    if (!question || !questionNumber) return;
    const correctAnswer = GameLogic.normalizeGuestAnswer(question.guest_answer, question);
    set(playAlongQuestionMetaRtdbRef(questionNumber), {
      questionText: question.question,
      correctAnswer,
      questionNumber,
    }).catch(() => {});
  }, [question?.id, questionNumber]);

  // Subscribe to RTDB answers for current question — live updates
  useEffect(() => {
    if (!questionNumber) return;

    const unsub = onValue(playAlongAnswersByQNumRef(questionNumber), (snapshot) => {
      const data = snapshot.val() as Record<string, any> | null;
      if (!data) { setResponses([]); return; }

      const startTime = gameState.currentQuestionStartTime ?? 0;
      const correctAnswer = question
        ? GameLogic.normalizeGuestAnswer(question.guest_answer, question)
        : null;

      const rows: ResponseRow[] = Object.entries(data).map(([uid, r]) => {
        const responseTimeMs = startTime > 0 ? r.timestamp - startTime : 0;
        const isCorrect = gameState.currentQuestionAnswerRevealed && correctAnswer
          ? r.answer === correctAnswer
          : null;
        return { uid, name: r.name, answer: r.answer, timestamp: r.timestamp, responseTimeMs, isCorrect };
      });

      rows.sort((a, b) => a.responseTimeMs - b.responseTimeMs);
      setResponses(rows);
    });

    return () => unsub();
  }, [questionNumber, gameState.currentQuestionAnswerRevealed, gameState.currentQuestionStartTime, question?.id]);

  const getFiltered = (): ResponseRow[] => {
    switch (filter) {
      case 'correct': return responses.filter(r => r.isCorrect === true);
      case 'incorrect': return responses.filter(r => r.isCorrect === false);
      case 'slowest': return [...responses].sort((a, b) => b.responseTimeMs - a.responseTimeMs);
      default: return responses;
    }
  };

  const toDisplayEntry = (r: ResponseRow): PlayAlongDisplayEntry => ({
    uid: r.uid,
    name: r.name,
    answer: r.answer as 'A' | 'B' | 'C' | 'D',
    timestamp: r.timestamp,
    responseTimeMs: r.responseTimeMs,
  });

  const pushDisplay = async (
    mode: GameState['playAlongDisplayMode'],
    entries: ResponseRow[]
  ) => {
    if (processing) return;
    setProcessing(true);
    try {
      await gameStateManager.updateGameState({
        playAlongDisplayMode: mode,
        playAlongDisplayEntries: entries.slice(0, 5).map(toDisplayEntry),
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
        playAlongDisplayEntries: [],
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
        <span className="text-gray-400 text-sm">
          {participantCount > 0 ? `${participantCount} participants · ` : ''}{responses.length} responses
        </span>
      </div>

      {!question ? (
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
          {filtered.length === 0 ? (
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
