import React, { useState } from 'react';
import type { GameState } from '@/lib/types';
import { gameStateManager } from '@/lib/gameState';
import { soundPlayer } from '@/lib/sounds';
import { GameLogic } from '@/utils/gameLogic';
import { PRIZE_TIERS } from '@/lib/firebase';
import { setDoc } from 'firebase/firestore';
import { db, questionsDocRef } from '@/lib/firebase';

interface GameControlsProps {
  gameState: GameState;
  onError: (error: string) => void;
  onQuestionUsed: () => void;
}

export default function GameControls({ gameState, onError, onQuestionUsed }: GameControlsProps) {
  const [processing, setProcessing] = useState(false);

  const handleSubmitPanelGuess = async (guess: 'A' | 'B' | 'C' | 'D') => {
    if (processing) return;
    
    try {
      setProcessing(true);
      
      // Play sound immediately (non-blocking)
      soundPlayer.playSound('questionSelection');
      
      // Immediate local update for operator feedback
      console.log('Submitting panel guess:', guess);
      
      await gameStateManager.updateGameState({
        panelGuess: guess,
        panelGuessSubmitted: true
      });
    } catch (error) {
      onError('Failed to submit panel guess');
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckPanelGuess = async () => {
    if (processing || !gameState.currentQuestion || !gameState.panelGuess) return;

    try {
      setProcessing(true);
      
      console.log('Checking panel guess - immediate action:', {
        panelGuess: gameState.panelGuess,
        guestAnswer: gameState.currentQuestion.guest_answer,
        gameState: gameState
      });
      
      // Calculate result using game logic
      const updates = GameLogic.calculatePanelGuessResult(gameState, gameState.panelGuess);
      
      console.log('Panel guess updates - applying immediately:', updates);
      
      // Calculate result for immediate sound feedback
      const isCorrect = GameLogic.isPanelGuessCorrectWithContext(
        gameState.panelGuess, 
        gameState.currentQuestion.guest_answer,
        gameState.currentQuestion
      );
      
      console.log('Panel guess result - immediate:', isCorrect);
      
      // Play sound immediately (non-blocking)
      soundPlayer.playSound(isCorrect ? 'panelCorrect' : 'panelWrong');
      
      // Update game state with immediate local optimistic update
      await gameStateManager.updateGameState(updates);
      
      console.log('Panel guess check completed - should sync immediately');
      
    } catch (error) {
      console.error('Panel guess check error:', error);
      onError(`Failed to check panel guess: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleRevealGuestAnswer = async () => {
    if (processing || !gameState.currentQuestion) return;

    try {
      setProcessing(true);
      
      console.log('Revealing guest answer - immediate action');
      
      // Calculate reveal result
      const updates = GameLogic.calculateRevealResult(gameState);
      
      // Mark question as used
      const usedQuestionUpdates = GameLogic.markQuestionAsUsed(
        gameState, 
        gameState.currentQuestion.id
      );
      
      const combinedUpdates = { ...updates, ...usedQuestionUpdates };
      
      console.log('Guest answer reveal updates - applying immediately:', combinedUpdates);
      
      // Play sound and update state with optimistic local update
      await Promise.all([
        soundPlayer.playSound('revealAnswer'),
        gameStateManager.updateGameState(combinedUpdates)
      ]);
      
      onQuestionUsed(); // Refresh question pool
      
      console.log('Guest answer revealed - should sync immediately');
      
    } catch (error) {
      onError('Failed to reveal guest answer');
    } finally {
      setProcessing(false);
    }
  };

  const handlePlaceLock = async () => {
    if (processing || !GameLogic.canPlaceLock(gameState)) return;

    try {
      setProcessing(true);
      
      const lockLevel = gameState.currentQuestionNumber;
      const updates = GameLogic.calculateLockPlacement(gameState, lockLevel);
      
      await soundPlayer.playSound('lockPlaced');
      await gameStateManager.updateGameState(updates);
      
    } catch (error) {
      onError('Failed to place lock');
    } finally {
      setProcessing(false);
    }
  };

  const handlePlaceLockAtLevel = async (level: number) => {
    if (processing || !gameState || gameState.lock.placed) return;

    try {
      setProcessing(true);
      
      const updates = GameLogic.calculateLockPlacement(gameState, level);
      
      await soundPlayer.playSound('lockPlaced');
      await gameStateManager.updateGameState(updates);
      
    } catch (error) {
      onError(`Failed to place lock at level ${level}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleResetGame = async () => {
    if (processing) return;
    
    if (!confirm('Are you sure you want to reset the game? This will keep all questions but reset the game state.')) {
      return;
    }

    try {
      setProcessing(true);
      await gameStateManager.resetGame();
      onQuestionUsed(); // Refresh question pool
    } catch (error) {
      onError('Failed to reset game');
    } finally {
      setProcessing(false);
    }
  };

  const handleResetEverything = async () => {
    if (processing) return;
    
    if (!confirm('Are you sure you want to reset EVERYTHING? This will delete ALL questions and reset the game to state zero. This cannot be undone!')) {
      return;
    }

    try {
      setProcessing(true);
      
      // Step 1: Reset game state to default
      await gameStateManager.resetEverything();
      
      // Step 2: Clear all questions from Firebase
      await setDoc(questionsDocRef, {
        questions: [],
        lastUpdated: new Date().toISOString(),
        totalQuestions: 0
      });
      
      console.log('All questions cleared from Firebase');
      
      // Step 3: Refresh the question pool to show empty state
      onQuestionUsed();
      
      console.log('Everything reset successfully - back to state zero');
      
    } catch (error) {
      console.error('Error in reset everything:', error);
      onError(`Failed to reset everything: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Game Controls</h2>
      
      {/* Current Question Display */}
      {gameState.currentQuestion ? (
        <div className="bg-blue-900 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-white">Current Question</h3>
            <div className="text-sm text-gray-300">
              Level {gameState.currentQuestionNumber} | Prize: ₹{gameState.prize.toLocaleString()}
            </div>
          </div>
          
          <p className="text-gray-200 mb-4">{gameState.currentQuestion.question}</p>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="text-gray-300">A) {gameState.currentQuestion.option_a}</div>
            <div className="text-gray-300">B) {gameState.currentQuestion.option_b}</div>
            <div className="text-gray-300">C) {gameState.currentQuestion.option_c}</div>
            <div className="text-gray-300">D) {gameState.currentQuestion.option_d}</div>
          </div>
          
          <div className="text-sm text-yellow-300 mb-2">
            Guest Answer: {gameState.currentQuestion.guest_answer} 
            {gameState.currentQuestion.guest_answer && ['A', 'B', 'C', 'D'].includes(gameState.currentQuestion.guest_answer.toString().toUpperCase()) && (
              <span className="text-gray-300">
                ({gameState.currentQuestion.guest_answer === 'A' ? gameState.currentQuestion.option_a : 
                  gameState.currentQuestion.guest_answer === 'B' ? gameState.currentQuestion.option_b :
                  gameState.currentQuestion.guest_answer === 'C' ? gameState.currentQuestion.option_c :
                  gameState.currentQuestion.option_d})
              </span>
            )}
          </div>
          
          <div className="text-xs text-gray-400 flex gap-4">
            <span>Guest Wins: {gameState.questionsAnswered}</span>
            <span>Panel Correct: {gameState.panelCorrectAnswers}/2</span>
            {gameState.gameOver && <span className="text-red-400">⚠️ GAME OVER - Final Gamble Time!</span>}
          </div>
        </div>
      ) : (
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">No Question Selected</h3>
          <p className="text-gray-300 mb-2">Please select a question from the pool below to start the game.</p>
          <div className="text-xs text-gray-400 flex gap-4">
            <span>Guest Wins: {gameState.questionsAnswered}</span>
            <span>Panel Correct: {gameState.panelCorrectAnswers}/2</span>
          </div>
        </div>
      )}

      {/* Step 1: Panel Guess - Always Show */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Step 1: Panel Guess</h3>
        <div className="flex gap-2">
          {(['A', 'B', 'C', 'D'] as const).map((option) => (
            <button
              key={option}
              onClick={() => handleSubmitPanelGuess(option)}
              disabled={processing || gameState.panelGuessSubmitted || !gameState.currentQuestion}
              className={`px-4 py-2 rounded font-semibold transition-colors ${
                gameState.panelGuess === option
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {option}
            </button>
          ))}
        </div>
        {gameState.panelGuess && (
          <p className="text-green-400 mt-2">Panel guess: {gameState.panelGuess}</p>
        )}
        {!gameState.currentQuestion && (
          <p className="text-yellow-400 mt-2">Select a question first</p>
        )}
      </div>

      {/* Step 2: Check Panel Guess - Always Show */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Step 2: Check Panel Guess</h3>
        <button
          onClick={handleCheckPanelGuess}
          disabled={processing || !gameState.panelGuessSubmitted || gameState.panelGuessChecked || !gameState.currentQuestion}
          className="px-6 py-2 bg-yellow-600 text-white rounded font-semibold hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {processing ? 'Checking...' : 'Check Panel Guess'}
        </button>
        
        {/* Show immediate result when panel guess is checked */}
        {gameState.panelGuessChecked && !gameState.needsManualReveal && (
          <div className="mt-3 p-3 bg-green-900 border border-green-600 rounded">
            <div className="text-green-400 font-semibold text-xl">✅ Round Complete!</div>
            <div className="text-green-300">Panel = Guest Answer ({gameState.panelGuess})</div>
            <div className="text-yellow-300">Guest stays at ₹{gameState.prize.toLocaleString()}</div>
            <div className="text-white font-medium mt-2">🎯 Start next question below</div>
          </div>
        )}
        
        {gameState.panelGuessChecked && gameState.needsManualReveal && (
          <div className="mt-3 p-3 bg-red-900 border border-red-600 rounded">
            <div className="text-red-400 font-semibold">❌ Panel Wrong!</div>
            <div className="text-red-300">Panel ≠ Guest Answer</div>
            <div className="text-yellow-300 font-medium">👇 Click Step 3 to advance guest</div>
          </div>
        )}
      </div>

      {/* Step 3: Reveal Guest Answer - Only show when panel is wrong */}
      {gameState.needsManualReveal && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Step 3: Reveal Guest Answer</h3>
          <button
            onClick={handleRevealGuestAnswer}
            disabled={processing || gameState.currentQuestionAnswerRevealed}
            className="px-6 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {processing ? 'Revealing...' : 'Reveal Guest Answer'}
          </button>
        </div>
      )}

      {/* Lock Controls - Always Show */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Lock Control</h3>
        {gameState.lock.placed ? (
          <div className="text-green-400">
            🔒 Lock placed at Level {gameState.lock.level} - ₹{GameLogic.getPrizeForLevel(gameState.lock.level!).toLocaleString()}
          </div>
        ) : GameLogic.canPlaceLock(gameState) ? (
          <div className="space-y-2">
            <label className="block text-gray-300 text-sm">Select prize tier to lock:</label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handlePlaceLockAtLevel(parseInt(e.target.value));
                }
              }}
              disabled={processing}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-purple-500 focus:outline-none disabled:opacity-50"
              defaultValue=""
            >
              <option value="" disabled>Choose level to lock...</option>
              {PRIZE_TIERS
                .filter(tier => tier.level <= gameState.currentQuestionNumber)
                .map(tier => (
                  <option key={tier.level} value={tier.level}>
                    Level {tier.level} - ₹{tier.amount.toLocaleString()}
                  </option>
                ))
              }
            </select>
            <p className="text-xs text-gray-400">
              Lock can only secure amounts already won (current level or below)
            </p>
          </div>
        ) : (
          <div className="text-gray-400">
            Lock not available (already placed or game over)
          </div>
        )}
      </div>

      {/* Reset Controls - Always Show */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Reset Controls</h3>
        <div className="flex gap-4">
          <button
            onClick={handleResetGame}
            disabled={processing}
            className="px-6 py-2 bg-orange-600 text-white rounded font-semibold hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            🔄 Reset Game Only
          </button>
          
          <button
            onClick={handleResetEverything}
            disabled={processing}
            className="px-6 py-2 bg-red-700 text-white rounded font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ⚠️ Reset EVERYTHING
          </button>
        </div>
      </div>

      {/* Reset Information */}
      <div className="p-3 bg-gray-700 rounded text-sm text-gray-300">
        <p>🔄 <strong>Reset Game Only:</strong> Keeps questions, resets game state</p>
        <p>⚠️ <strong>Reset EVERYTHING:</strong> Deletes ALL questions + resets to state zero</p>
      </div>
    </div>
  );
}