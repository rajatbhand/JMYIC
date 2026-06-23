'use client';

import React, { useState, useEffect, useRef } from 'react';
import { onValue } from 'firebase/database';
import { collection, getDocs } from 'firebase/firestore';
import { db, playAlongAnswersRtdbRef, playAlongQuestionsMetaRtdbRef } from '@/lib/firebase';
import { gameStateManager } from '@/lib/gameState';
import type { GameState } from '@/lib/types';

type FilterMode = 'all' | 'correct' | 'incorrect' | 'slowest';

interface QuestionMeta {
  questionNumber: number;
  questionText: string;
  correctAnswer: string | null;
}

interface UserAnswer {
  answer: string;
  timestamp: number;
}

interface UserRow {
  uid: string;
  name: string;
  answers: Record<string, UserAnswer>; // keyed by questionNumber string
}

export default function LeaderboardPage() {
  // Raw RTDB state
  const [answersData, setAnswersData] = useState<Record<string, Record<string, any>>>({});
  const [questionsMetaData, setQuestionsMetaData] = useState<Record<string, any>>({});
  const [participantCount, setParticipantCount] = useState(0);

  // UI state
  const [selectedQuestion, setSelectedQuestion] = useState<string>('all');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [followingLive, setFollowingLive] = useState(true);
  const prevQuestionNumberRef = useRef<number | null>(null);

  // Subscribe to RTDB game state
  useEffect(() => {
    const unsub = gameStateManager.subscribeToGameState(setGameState);
    return () => unsub();
  }, []);

  // Subscribe to RTDB play-along answers (all questions, live)
  useEffect(() => {
    const unsub = onValue(playAlongAnswersRtdbRef, (snapshot) => {
      setAnswersData(snapshot.val() ?? {});
    });
    return () => unsub();
  }, []);

  // Subscribe to RTDB question metadata (questionText, correctAnswer per question number)
  useEffect(() => {
    const unsub = onValue(playAlongQuestionsMetaRtdbRef, (snapshot) => {
      setQuestionsMetaData(snapshot.val() ?? {});
    });
    return () => unsub();
  }, []);

  // Fetch total registered participant count from Firestore (one-time, not real-time)
  useEffect(() => {
    getDocs(collection(db, 'playAlongUsers'))
      .then(snap => setParticipantCount(snap.size))
      .catch(() => {});
  }, []);

  // Auto-focus to current question tab; reset ref when question is cleared so same number re-triggers
  useEffect(() => {
    if (!gameState?.currentQuestion) {
      prevQuestionNumberRef.current = null;
      return;
    }
    const num = gameState.currentQuestionNumber;
    if (num !== prevQuestionNumberRef.current) {
      prevQuestionNumberRef.current = num;
      if (followingLive) {
        setSelectedQuestion(String(num));
        setFilter('all');
      }
    }
  }, [gameState?.currentQuestion?.id, gameState?.currentQuestionNumber, followingLive]);

  // Re-enable live-following when game is fully reset so next question auto-focuses
  useEffect(() => {
    if (!gameState?.currentQuestion &&
        Object.keys(questionsMetaData).length === 0 &&
        Object.keys(answersData).length === 0) {
      setFollowingLive(true);
    }
  }, [gameState?.currentQuestion, questionsMetaData, answersData]);

  // ── Derived state ────────────────────────────────────────────────────────

  // Build question list from RTDB metadata + any question numbers that have answers
  const questions: QuestionMeta[] = React.useMemo(() => {
    const numSet = new Set<number>([
      ...Object.keys(questionsMetaData).map(Number),
      ...Object.keys(answersData).map(Number),
    ].filter(n => !isNaN(n)));
    return Array.from(numSet)
      .sort((a, b) => a - b)
      .map(num => ({
        questionNumber: num,
        questionText: questionsMetaData[num]?.questionText ?? `Question ${num}`,
        correctAnswer: questionsMetaData[num]?.correctAnswer ?? null,
      }));
  }, [questionsMetaData, answersData]);

  // Questions visible in the "All Questions" table — hides current live question until answer is revealed
  const visibleQuestions = React.useMemo(() =>
    questions.filter(q =>
      q.questionNumber !== (gameState?.currentQuestionNumber ?? -1) ||
      (gameState?.currentQuestionAnswerRevealed ?? false)
    ),
    [questions, gameState?.currentQuestionNumber, gameState?.currentQuestionAnswerRevealed]
  );

  // Build user rows for "All Questions" view
  const userRows: UserRow[] = React.useMemo(() => {
    const userMap = new Map<string, UserRow>();
    for (const [qNumStr, responses] of Object.entries(answersData)) {
      if (!responses || typeof responses !== 'object') continue;
      for (const [uid, r] of Object.entries(responses as Record<string, any>)) {
        if (!userMap.has(uid)) {
          userMap.set(uid, { uid, name: r.name ?? uid, answers: {} });
        }
        const user = userMap.get(uid)!;
        const existing = user.answers[qNumStr];
        if (!existing || r.timestamp > existing.timestamp) {
          user.answers[qNumStr] = { answer: r.answer, timestamp: r.timestamp };
          if (r.name) user.name = r.name;
        }
      }
    }
    // Sort by correct count on visible (revealed) questions only
    return Array.from(userMap.values()).sort((a, b) => {
      const aCorrect = visibleQuestions.filter(q =>
        q.correctAnswer && a.answers[String(q.questionNumber)]?.answer === q.correctAnswer
      ).length;
      const bCorrect = visibleQuestions.filter(q =>
        q.correctAnswer && b.answers[String(q.questionNumber)]?.answer === q.correctAnswer
      ).length;
      return bCorrect - aCorrect;
    });
  }, [answersData, visibleQuestions]);

  const getCorrectCount = (user: UserRow) =>
    visibleQuestions.filter(q =>
      q.correctAnswer && user.answers[String(q.questionNumber)]?.answer === q.correctAnswer
    ).length;

  const selectedMeta = selectedQuestion !== 'all'
    ? questions.find(q => String(q.questionNumber) === selectedQuestion) ?? null
    : null;

  // Also synthesize meta from gameState for the live question if not in RTDB yet
  const liveMeta: QuestionMeta | null = React.useMemo(() => {
    if (!gameState?.currentQuestion || !gameState.currentQuestionNumber) return null;
    const num = gameState.currentQuestionNumber;
    if (questions.some(q => q.questionNumber === num)) return null; // already in list
    return {
      questionNumber: num,
      questionText: gameState.currentQuestion.question,
      correctAnswer: null,
    };
  }, [gameState?.currentQuestion, gameState?.currentQuestionNumber, questions]);

  const allQuestions: QuestionMeta[] = liveMeta ? [...questions, liveMeta].sort((a, b) => a.questionNumber - b.questionNumber) : questions;

  const effectiveSelectedMeta = selectedMeta ??
    (selectedQuestion !== 'all' && liveMeta && String(liveMeta.questionNumber) === selectedQuestion ? liveMeta : null);

  const singleQuestionRows = React.useMemo(() => {
    if (!effectiveSelectedMeta) return null;
    const key = String(effectiveSelectedMeta.questionNumber);
    const qAnswers = answersData[key] ?? {};
    let rows = Object.entries(qAnswers as Record<string, any>).map(([uid, r]) => ({
      uid,
      name: r.name ?? uid,
      answer: r.answer as string,
      timestamp: r.timestamp as number,
    }));

    if (filter === 'correct' && effectiveSelectedMeta.correctAnswer) {
      rows = rows.filter(r => r.answer === effectiveSelectedMeta.correctAnswer);
    } else if (filter === 'incorrect' && effectiveSelectedMeta.correctAnswer) {
      rows = rows.filter(r => r.answer !== effectiveSelectedMeta.correctAnswer);
    }

    if (filter === 'slowest') {
      rows.sort((a, b) => b.timestamp - a.timestamp);
    } else {
      rows.sort((a, b) => a.timestamp - b.timestamp);
    }

    return rows;
  }, [effectiveSelectedMeta, answersData, filter]);

  const FILTERS: { id: FilterMode; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'correct', label: 'Correct' },
    { id: 'incorrect', label: 'Incorrect' },
    { id: 'slowest', label: 'Slowest' },
  ];

  // Whether the current question's table should be visible
  const isCurrentQuestion = (qNum: number) => qNum === (gameState?.currentQuestionNumber ?? -1);
  const showTable = (qNum: number) => !isCurrentQuestion(qNum) || (gameState?.currentQuestionAnswerRevealed ?? false);

  const handleTabClick = (value: string) => {
    setSelectedQuestion(value);
    setFollowingLive(false);
    if (value !== 'all') setFilter('all');
  };

  const handleFollowLive = () => {
    setFollowingLive(true);
    if (gameState?.currentQuestionNumber) {
      setSelectedQuestion(String(gameState.currentQuestionNumber));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-indigo-950 px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white font-bebas tracking-wide">Play Along Leaderboard</h1>
          <p className="text-purple-300 mt-2">
            Judge Me If You Can
            {participantCount > 0 && (
              <span className="ml-3 text-purple-400">· {participantCount} registered participants</span>
            )}
          </p>
        </div>

        {allQuestions.length === 0 ? (
          <div className="text-center py-24 text-white/30 text-xl">
            Waiting for the first question…
          </div>
        ) : (<>

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

          {allQuestions.map(q => (
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
              followingLive ? 'bg-green-600 text-white cursor-default' : 'bg-white/10 text-white/50 hover:bg-white/20'
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

        {selectedQuestion === 'all' ? (
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/10 text-white/60 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Rank</th>
                  <th className="text-left px-4 py-3">Name</th>
                  {visibleQuestions.map(q => (
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
                      {visibleQuestions.map(q => {
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
                    <td colSpan={visibleQuestions.length + 3} className="px-4 py-10 text-center text-white/30">
                      No play along data yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
            {effectiveSelectedMeta && (
              <div className="bg-yellow-400 rounded-xl p-4 mb-6 text-center">
                <p className="text-xs text-yellow-900 uppercase tracking-wide font-semibold mb-1">
                  Question {effectiveSelectedMeta.questionNumber}
                </p>
                <p className="text-green-900 font-bold text-lg">{effectiveSelectedMeta.questionText}</p>
                {effectiveSelectedMeta.correctAnswer && (
                  <p className="text-green-800 text-sm mt-1">
                    Correct Answer: <strong>{effectiveSelectedMeta.correctAnswer}</strong>
                  </p>
                )}
              </div>
            )}

            {/* For the live question: show count only until panel guess is checked */}
            {effectiveSelectedMeta && !showTable(effectiveSelectedMeta.questionNumber) && (
              <div className="text-center py-14">
                <p className="text-7xl font-bold text-white font-bebas mb-2">
                  {Object.keys(answersData[selectedQuestion] ?? {}).length}
                </p>
                <p className="text-purple-300 text-lg">responses received</p>
                <p className="text-white/30 text-sm mt-3">Results shown after guest answer is revealed</p>
              </div>
            )}

            {/* Show full table for past questions OR after panel guess is checked */}
            {effectiveSelectedMeta && showTable(effectiveSelectedMeta.questionNumber) && (
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
                  {(singleQuestionRows ?? []).map((row, i) => {
                    const isCorrect = effectiveSelectedMeta?.correctAnswer
                      ? row.answer === effectiveSelectedMeta.correctAnswer
                      : null;
                    return (
                      <tr key={row.uid} className={`border-t border-white/5 ${i % 2 === 0 ? 'bg-white/5' : ''}`}>
                        <td className="px-4 py-3 text-white/50 font-bold">{i + 1}</td>
                        <td className="px-4 py-3 text-white font-semibold">{row.name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                            isCorrect === true ? 'bg-green-600 text-white' :
                            isCorrect === false ? 'bg-red-700 text-white' :
                            'bg-yellow-700 text-white'
                          }`}>
                            {row.answer}
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
                      <td colSpan={4} className="px-4 py-10 text-center text-white/30">
                        {filter !== 'all'
                          ? `No ${filter} responses for this question.`
                          : 'No responses yet — waiting for players to answer.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        </>)}
      </div>
    </div>
  );
}
