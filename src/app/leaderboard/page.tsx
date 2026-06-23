'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { PlayAlongResponse } from '@/lib/types';

interface QuestionMeta {
  questionId: string;
  questionNumber: number;
  questionText: string;
  correctAnswer: string | null;
}

interface UserRow {
  uid: string;
  name: string;
  phone: string;
  answers: Record<string, { answer: string; timestamp: number; responseTimeMs: number }>;
}

export default function LeaderboardPage() {
  const [questions, setQuestions] = useState<QuestionMeta[]>([]);
  const [userRows, setUserRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<string>('all');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Fetch all question-level docs from playAlongAnswers
        const questionsSnap = await getDocs(collection(db, 'playAlongAnswers'));
        const questionMetas: QuestionMeta[] = questionsSnap.docs.map(d => ({
          questionId: d.id,
          questionNumber: d.data().questionNumber ?? 0,
          questionText: d.data().questionText ?? d.id,
          correctAnswer: d.data().correctAnswer ?? null
        })).sort((a, b) => a.questionNumber - b.questionNumber);

        setQuestions(questionMetas);

        // Build per-user map
        const userMap = new Map<string, UserRow>();

        for (const qMeta of questionMetas) {
          const responsesSnap = await getDocs(
            collection(db, 'playAlongAnswers', qMeta.questionId, 'responses')
          );

          for (const respDoc of responsesSnap.docs) {
            const data = respDoc.data() as PlayAlongResponse;
            const uid = respDoc.id;

            if (!userMap.has(uid)) {
              userMap.set(uid, {
                uid,
                name: data.name,
                phone: data.phone,
                answers: {}
              });
            }

            const user = userMap.get(uid)!;
            // Response time can't be computed here without startTime; store raw timestamp
            user.answers[qMeta.questionId] = {
              answer: data.answer,
              timestamp: data.timestamp,
              responseTimeMs: 0 // Will be enriched if needed
            };
          }
        }

        // Compute totals and sort by total correct desc
        const rows = Array.from(userMap.values());

        // Sort: most correct first, then fastest average
        const sorted = rows.sort((a, b) => {
          const aCorrect = questionMetas.filter(q =>
            q.correctAnswer && a.answers[q.questionId]?.answer === q.correctAnswer
          ).length;
          const bCorrect = questionMetas.filter(q =>
            q.correctAnswer && b.answers[q.questionId]?.answer === q.correctAnswer
          ).length;
          return bCorrect - aCorrect;
        });

        setUserRows(sorted);
      } catch (err) {
        console.error('Leaderboard load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const maskPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return `****${digits.slice(-4)}`;
  };

  const getCorrectCount = (user: UserRow) =>
    questions.filter(q => q.correctAnswer && user.answers[q.questionId]?.answer === q.correctAnswer).length;

  // Single-question view: sort by response timestamp (fastest first)
  const singleQuestionRows = selectedQuestion !== 'all'
    ? [...userRows]
        .filter(u => u.answers[selectedQuestion])
        .sort((a, b) => (a.answers[selectedQuestion]?.timestamp ?? 0) - (b.answers[selectedQuestion]?.timestamp ?? 0))
    : null;

  const selectedMeta = questions.find(q => q.questionId === selectedQuestion);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-indigo-950 px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white font-bebas tracking-wide">Play Along Leaderboard</h1>
          <p className="text-purple-300 mt-2">Judge Me If You Can</p>
        </div>

        {/* Question filter */}
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          <button
            onClick={() => setSelectedQuestion('all')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              selectedQuestion === 'all' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            All Questions
          </button>
          {questions.map(q => (
            <button
              key={q.questionId}
              onClick={() => setSelectedQuestion(q.questionId)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                selectedQuestion === q.questionId ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Q{q.questionNumber}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-purple-400/40 border-t-purple-400 rounded-full animate-spin mx-auto" />
            <p className="text-white/50 mt-4">Loading...</p>
          </div>
        ) : selectedQuestion === 'all' ? (
          /* Full leaderboard */
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/10 text-white/60 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Rank</th>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Phone</th>
                  {questions.map(q => (
                    <th key={q.questionId} className="text-center px-3 py-3">Q{q.questionNumber}</th>
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
                      <td className="px-4 py-3 text-white/50 tabular-nums">{maskPhone(user.phone)}</td>
                      {questions.map(q => {
                        const ans = user.answers[q.questionId];
                        if (!ans) {
                          return (
                            <td key={q.questionId} className="px-3 py-3 text-center">
                              <span className="text-white/20">—</span>
                            </td>
                          );
                        }
                        const isCorrect = q.correctAnswer ? ans.answer === q.correctAnswer : null;
                        return (
                          <td key={q.questionId} className="px-3 py-3 text-center">
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
          /* Single question view */
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
                    <th className="text-left px-4 py-3">Phone</th>
                    <th className="text-center px-4 py-3">Answer</th>
                    <th className="text-center px-4 py-3">Correct?</th>
                  </tr>
                </thead>
                <tbody>
                  {(singleQuestionRows ?? []).map((user, i) => {
                    const ans = user.answers[selectedQuestion];
                    const isCorrect = selectedMeta?.correctAnswer ? ans.answer === selectedMeta.correctAnswer : null;
                    return (
                      <tr key={user.uid} className={`border-t border-white/5 ${i % 2 === 0 ? 'bg-white/5' : ''}`}>
                        <td className="px-4 py-3 text-white/50 font-bold">{i + 1}</td>
                        <td className="px-4 py-3 text-white font-semibold">{user.name}</td>
                        <td className="px-4 py-3 text-white/50 tabular-nums">{maskPhone(user.phone)}</td>
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
                        No responses for this question yet.
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
