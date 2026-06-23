'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { gameStateManager } from '@/lib/gameState';
import type { PlayAlongResponse } from '@/lib/types';
import type { GameState } from '@/lib/types';

type FilterMode = 'all' | 'correct' | 'incorrect' | 'slowest';

interface QuestionMeta {
  questionNumber: number;
  questionText: string;
  correctAnswer: string | null;
  questionIds: string[]; // all doc IDs that share this questionNumber
}

interface UserAnswer {
  answer: string;
  timestamp: number;
}

interface UserRow {
  uid: string;
  name: string;
  phone: string;
  // keyed by questionNumber (string) to merge across sessions
  answers: Record<string, UserAnswer>;
}

export default function LeaderboardPage() {
  const [questions, setQuestions] = useState<QuestionMeta[]>([]);
  const [userRows, setUserRows] = useState<UserRow[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<string>('all');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [followingLive, setFollowingLive] = useState(true);

  // Subscribe to live game state for auto-focus
  useEffect(() => {
    const unsub = gameStateManager.subscribeToGameState(setGameState);
    return () => unsub();
  }, []);

  // Auto-focus to current question when followingLive is true (catches tab changes mid-session)
  useEffect(() => {
    if (!followingLive || !gameState?.currentQuestionNumber) return;
    const num = String(gameState.currentQuestionNumber);
    const exists = questions.some(q => String(q.questionNumber) === num);
    if (exists) {
      setSelectedQuestion(num);
    }
  }, [gameState?.currentQuestionNumber, followingLive, questions]);

  const prevQuestionNumberRef = React.useRef<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const questionsSnap = await getDocs(collection(db, 'playAlongAnswers'));

      // Group docs by questionNumber — deduplicate tabs
      const byNumber = new Map<number, QuestionMeta>();
      for (const d of questionsSnap.docs) {
        const num: number = d.data().questionNumber ?? 0;
        if (byNumber.has(num)) {
          byNumber.get(num)!.questionIds.push(d.id);
        } else {
          byNumber.set(num, {
            questionNumber: num,
            questionText: d.data().questionText ?? d.id,
            correctAnswer: d.data().correctAnswer ?? null,
            questionIds: [d.id],
          });
        }
      }

      const questionMetas = Array.from(byNumber.values())
        .sort((a, b) => a.questionNumber - b.questionNumber);

      setQuestions(questionMetas);

      // Build per-user map, merging responses from all docs of same questionNumber
      const userMap = new Map<string, UserRow>();

      for (const qMeta of questionMetas) {
        const key = String(qMeta.questionNumber);

        for (const qId of qMeta.questionIds) {
          const responsesSnap = await getDocs(
            collection(db, 'playAlongAnswers', qId, 'responses')
          );

          for (const respDoc of responsesSnap.docs) {
            const data = respDoc.data() as PlayAlongResponse;
            const uid = respDoc.id;

            if (!userMap.has(uid)) {
              userMap.set(uid, { uid, name: data.name, phone: data.phone, answers: {} });
            }

            const user = userMap.get(uid)!;
            // Keep the later answer if the question was answered in multiple sessions;
            // also update name/phone from the most recent response so renames are reflected
            const existing = user.answers[key];
            if (!existing || data.timestamp > existing.timestamp) {
              user.answers[key] = { answer: data.answer, timestamp: data.timestamp };
              if (data.name) user.name = data.name;
              if (data.phone) user.phone = data.phone;
            }
          }
        }
      }

      const rows = Array.from(userMap.values()).sort((a, b) => {
        const aCorrect = questionMetas.filter(q =>
          q.correctAnswer && a.answers[String(q.questionNumber)]?.answer === q.correctAnswer
        ).length;
        const bCorrect = questionMetas.filter(q =>
          q.correctAnswer && b.answers[String(q.questionNumber)]?.answer === q.correctAnswer
        ).length;
        return bCorrect - aCorrect;
      });

      setUserRows(rows);

      // Fetch total registered participants
      const usersSnap = await getDocs(collection(db, 'playAlongUsers'));
      setParticipantCount(usersSnap.size);
    } catch (err) {
      console.error('Leaderboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh + auto-focus when operator moves to a new question
  useEffect(() => {
    const num = gameState?.currentQuestionNumber ?? null;
    if (num === null) return;
    if (num !== prevQuestionNumberRef.current) {
      prevQuestionNumberRef.current = num;
      loadData();
      if (followingLive) {
        setSelectedQuestion(String(num));
        setFilter('all');
      }
    }
  }, [gameState?.currentQuestionNumber, followingLive, loadData]);

  const getCorrectCount = (user: UserRow) =>
    questions.filter(q =>
      q.correctAnswer && user.answers[String(q.questionNumber)]?.answer === q.correctAnswer
    ).length;

  const selectedMeta = selectedQuestion !== 'all'
    ? questions.find(q => String(q.questionNumber) === selectedQuestion)
    : null;

  const singleQuestionRows = (() => {
    if (!selectedMeta) return null;
    const key = String(selectedMeta.questionNumber);

    let rows = userRows.filter(u => u.answers[key]);

    if (filter === 'correct') {
      rows = rows.filter(u => selectedMeta.correctAnswer && u.answers[key]?.answer === selectedMeta.correctAnswer);
    } else if (filter === 'incorrect') {
      rows = rows.filter(u => selectedMeta.correctAnswer && u.answers[key]?.answer !== selectedMeta.correctAnswer);
    }

    if (filter === 'slowest') {
      rows = [...rows].sort((a, b) => (b.answers[key]?.timestamp ?? 0) - (a.answers[key]?.timestamp ?? 0));
    } else {
      rows = [...rows].sort((a, b) => (a.answers[key]?.timestamp ?? 0) - (b.answers[key]?.timestamp ?? 0));
    }

    return rows;
  })();

  const FILTERS: { id: FilterMode; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'correct', label: 'Correct' },
    { id: 'incorrect', label: 'Incorrect' },
    { id: 'slowest', label: 'Slowest' },
  ];

  const handleTabClick = (value: string) => {
    setSelectedQuestion(value);
    setFollowingLive(false);
    if (value !== 'all') setFilter('all');
  };

  const handleFollowLive = () => {
    setFollowingLive(true);
    if (gameState?.currentQuestionNumber) {
      const num = String(gameState.currentQuestionNumber);
      const exists = questions.some(q => String(q.questionNumber) === num);
      setSelectedQuestion(exists ? num : 'all');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-indigo-950 px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 flex items-center justify-center gap-4">
          <div>
            <h1 className="text-5xl font-bold text-white font-bebas tracking-wide">Play Along Leaderboard</h1>
            <p className="text-purple-300 mt-2">
              Judge Me If You Can
              {participantCount > 0 && (
                <span className="ml-3 text-purple-400">· {participantCount} registered participants</span>
              )}
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="ml-4 px-4 py-2 rounded-lg bg-purple-700 text-white text-sm font-semibold hover:bg-purple-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Loading…' : '↺ Refresh'}
          </button>
        </div>

        {/* Question tabs */}
        <div className="flex flex-wrap gap-2 mb-4 justify-center">
          <button
            onClick={() => handleTabClick('all')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              selectedQuestion === 'all' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            All Questions
          </button>
          {questions.map(q => (
            <button
              key={q.questionNumber}
              onClick={() => handleTabClick(String(q.questionNumber))}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                selectedQuestion === String(q.questionNumber) ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Q{q.questionNumber}
            </button>
          ))}

          {/* Live auto-follow pill */}
          <button
            onClick={followingLive ? undefined : handleFollowLive}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              followingLive
                ? 'bg-green-600 text-white cursor-default'
                : 'bg-white/10 text-white/50 hover:bg-white/20'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${followingLive ? 'bg-green-300 animate-pulse' : 'bg-white/30'}`} />
            Live
          </button>
        </div>

        {/* Filter row — only shown in single-question view */}
        {selectedQuestion !== 'all' && (
          <div className="flex gap-2 mb-6 justify-center">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  filter === f.id ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-purple-400/40 border-t-purple-400 rounded-full animate-spin mx-auto" />
            <p className="text-white/50 mt-4">Loading...</p>
          </div>
        ) : selectedQuestion === 'all' ? (
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/10 text-white/60 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Rank</th>
                  <th className="text-left px-4 py-3">Name</th>
                  {questions.map(q => (
                    <th key={q.questionNumber} className="text-center px-3 py-3">Q{q.questionNumber}</th>
                  ))}
                  <th className="text-center px-4 py-3">Correct</th>
                </tr>
              </thead>
              <tbody>
                {userRows.map((user, i) => {
                  const totalCorrect = getCorrectCount(user);
                  return (
                    <tr key={user.uid} className={`border-t border-white/5 ${i % 2 === 0 ? 'bg-white/5' : ''}`}>
                      <td className="px-4 py-3 text-white/50 font-bold">{i + 1}</td>
                      <td className="px-4 py-3 text-white font-semibold">{user.name}</td>
                      {questions.map(q => {
                        const ans = user.answers[String(q.questionNumber)];
                        if (!ans) return (
                          <td key={q.questionNumber} className="px-3 py-3 text-center">
                            <span className="text-white/20">—</span>
                          </td>
                        );
                        const isCorrect = q.correctAnswer ? ans.answer === q.correctAnswer : null;
                        return (
                          <td key={q.questionNumber} className="px-3 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                              isCorrect === true ? 'bg-green-600 text-white' :
                              isCorrect === false ? 'bg-red-700 text-white' :
                              'bg-yellow-700 text-white'
                            }`}>
                              {ans.answer}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold text-lg ${totalCorrect > 0 ? 'text-green-400' : 'text-white/30'}`}>
                          {totalCorrect}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {userRows.length === 0 && (
                  <tr>
                    <td colSpan={questions.length + 4} className="px-4 py-10 text-center text-white/30">
                      No play along data yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
            {selectedMeta && (
              <div className="bg-yellow-400 rounded-xl p-4 mb-6 text-center">
                <p className="text-xs text-yellow-900 uppercase tracking-wide font-semibold mb-1">Question {selectedMeta.questionNumber}</p>
                <p className="text-green-900 font-bold text-lg">{selectedMeta.questionText}</p>
                {selectedMeta.correctAnswer && (
                  <p className="text-green-800 text-sm mt-1">Correct Answer: <strong>{selectedMeta.correctAnswer}</strong></p>
                )}
              </div>
            )}
            <div className="overflow-x-auto rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/10 text-white/60 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Rank</th>
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-center px-4 py-3">Answer</th>
                    <th className="text-center px-4 py-3">Correct?</th>
                  </tr>
                </thead>
                <tbody>
                  {(singleQuestionRows ?? []).map((user, i) => {
                    const key = String(selectedMeta?.questionNumber);
                    const ans = user.answers[key];
                    const isCorrect = selectedMeta?.correctAnswer ? ans.answer === selectedMeta.correctAnswer : null;
                    return (
                      <tr key={user.uid} className={`border-t border-white/5 ${i % 2 === 0 ? 'bg-white/5' : ''}`}>
                        <td className="px-4 py-3 text-white/50 font-bold">{i + 1}</td>
                        <td className="px-4 py-3 text-white font-semibold">{user.name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                            isCorrect === true ? 'bg-green-600 text-white' :
                            isCorrect === false ? 'bg-red-700 text-white' :
                            'bg-yellow-700 text-white'
                          }`}>
                            {ans.answer}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isCorrect === true ? <span className="text-green-400 text-lg">✓</span> :
                           isCorrect === false ? <span className="text-red-400 text-lg">✗</span> :
                           <span className="text-white/30">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {(singleQuestionRows ?? []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-white/30">
                        No {filter !== 'all' ? `${filter} ` : ''}responses for this question.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
