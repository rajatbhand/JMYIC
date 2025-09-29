import React, { useState } from 'react';
import type { GameState } from '@/lib/types';
import { gameStateManager } from '@/lib/gameState';
import { soundPlayer } from '@/lib/sounds';
import { GameLogic } from '@/utils/gameLogic';
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
      
      console.log('Checking panel guess:', {
        panelGuess: gameState.panelGuess,
        guestAnswer: gameState.currentQuestion.guest_answer,
        gameState: gameState
      });
      
      // Calculate result using game logic
      const updates = GameLogic.calculatePanelGuessResult(gameState, gameState.panelGuess);
      
      console.log('Panel guess updates:', updates);
      
      // Play appropriate sound
      const isCorrect = GameLogic.isPanelGuessCorrect(
        gameState.panelGuess, 
        gameState.currentQuestion.guest_answer
      );
      
      console.log('Panel guess is correct:', isCorrect);
      
      // Play sound
      try {
        await soundPlayer.playSound(isCorrect ? 'panelCorrect' : 'panelWrong');
      } catch (soundError) {
        console.error('Sound play error:', soundError);
      }
      
      // Update game state
      await gameStateManager.updateGameState(updates);
      
      console.log('Panel guess check completed successfully');
      
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
      
      // Calculate reveal result
      const updates = GameLogic.calculateRevealResult(gameState);
      
      // Mark question as used
      const usedQuestionUpdates = GameLogic.markQuestionAsUsed(
        gameState, 
        gameState.currentQuestion.id
      );
      
      const combinedUpdates = { ...updates, ...usedQuestionUpdates };
      
      await soundPlayer.playSound('revealAnswer');
      await gameStateManager.updateGameState(combinedUpdates);
      
      onQuestionUsed(); // Refresh question pool
      
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
          <h3 className="text-lg font-semibold text-white mb-2">Current Question</h3>
          <p className="text-gray-200 mb-4">{gameState.currentQuestion.question}</p>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="text-gray-300">A) {gameState.currentQuestion.option_a}</div>
            <div className="text-gray-300">B) {gameState.currentQuestion.option_b}</div>
            <div className="text-gray-300">C) {gameState.currentQuestion.option_c}</div>
            <div className="text-gray-300">D) {gameState.currentQuestion.option_d}</div>
          </div>
          
          <div className="text-sm text-yellow-300">
            Guest Answer: {gameState.currentQuestion.guest_answer}
          </div>
        </div>
      ) : (
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">No Question Selected</h3>
          <p className="text-gray-300">Please select a question from the pool below to start the game.</p>
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
      </div>

      {/* Step 3: Reveal Guest Answer (conditional) - Always Show */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Step 3: Reveal Guest Answer</h3>
        {gameState.needsManualReveal ? (
          <button
            onClick={handleRevealGuestAnswer}
            disabled={processing || gameState.currentQuestionAnswerRevealed}
            className="px-6 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {processing ? 'Revealing...' : 'Reveal Guest Answer'}
          </button>
        ) : (
          <div className="text-gray-400">
            {gameState.panelGuessChecked ? 'Auto-revealed (answers matched)' : 'Will show after checking panel guess'}
          </div>
        )}
      </div>

      {/* Lock Controls - Always Show */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Lock Control</h3>
        {GameLogic.canPlaceLock(gameState) ? (
          <button
            onClick={handlePlaceLock}
            disabled={processing}
            className="px-6 py-2 bg-purple-600 text-white rounded font-semibold hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {processing ? 'Placing...' : `Place Lock at ₹${GameLogic.getPrizeForLevel(gameState.currentQuestionNumber).toLocaleString()}`}
          </button>
        ) : (
          <div className="text-gray-400">
            Lock not available (need to use immunity first)
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