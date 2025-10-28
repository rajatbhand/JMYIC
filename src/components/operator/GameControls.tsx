import React, { useState, useEffect } from 'react';
import type { GameState } from '@/lib/types';
import { gameStateManager } from '@/lib/gameState';
import { GameLogic, showAllOrNothingPanelWinModal, showAllOrNothingGuestWinModal, toggleAllOrNothingModal } from '@/utils/gameLogic';
import { setDoc } from 'firebase/firestore';
import { db, questionsDocRef, PRIZE_TIERS } from '@/lib/firebase';

interface GameControlsProps {
  gameState: GameState;
  onError: (error: string) => void;
  onQuestionUsed: () => void;
}

export default function GameControls({ gameState, onError, onQuestionUsed }: GameControlsProps) {
  const [processing, setProcessing] = useState(false);
  const [selectedLockLevel, setSelectedLockLevel] = useState<number>(gameState.currentQuestionNumber || 1);

  // Update selected lock level when current question changes
  useEffect(() => {
    if (gameState.currentQuestionNumber) {
      setSelectedLockLevel(gameState.currentQuestionNumber);
    }
  }, [gameState.currentQuestionNumber]);

  // Debug logging for All or Nothing state
  useEffect(() => {
    console.log('🔵 DEBUG: GameControls state update:', {
      gameOver: gameState.gameOver,
      allOrNothingWon: gameState.allOrNothingWon,
      allOrNothingComplete: gameState.allOrNothingComplete,
      allOrNothingModalVisible: gameState.allOrNothingModalVisible,
      conditionResult: gameState.gameOver && (gameState.allOrNothingWon === true || gameState.allOrNothingWon === false)
    });
  }, [gameState.gameOver, gameState.allOrNothingWon, gameState.allOrNothingComplete, gameState.allOrNothingModalVisible]);

  const handleSubmitPanelGuess = async (guess: 'A' | 'B' | 'C' | 'D') => {
    if (processing) return;
    
    try {
      setProcessing(true);
      
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
      
      console.log('Panel guess updates:', updates);
      
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
      
      const lockLevel = selectedLockLevel;
      const updates = GameLogic.calculateLockPlacement(gameState, lockLevel);
      
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



  const handleStartAllOrNothing = async () => {
    if (processing || !GameLogic.canStartAllOrNothing(gameState)) return;

    try {
      setProcessing(true);
      
      const updates = GameLogic.startAllOrNothing(gameState);
      
      await gameStateManager.updateGameState(updates);
      
      console.log('All or Nothing started');
      
    } catch (error) {
      onError('Failed to start All or Nothing');
    } finally {
      setProcessing(false);
    }
  };

  const handleTriggerGameOver = async () => {
    if (processing || !GameLogic.canTriggerGameOver(gameState)) return;

    try {
      setProcessing(true);
      
      const updates = GameLogic.triggerGameOver(gameState);
      
      await gameStateManager.updateGameState(updates);
      
      console.log('Game over triggered manually');
      
    } catch (error) {
      onError('Failed to trigger game over');
    } finally {
      setProcessing(false);
    }
  };

  const handleShowPanelWinModal = async () => {
    if (processing || !gameState.allOrNothingPendingPanelWin) return;

    try {
      setProcessing(true);
      await showAllOrNothingPanelWinModal();
      console.log('All or Nothing panel win modal triggered');
    } catch (error) {
      onError('Failed to show panel win modal');
    } finally {
      setProcessing(false);
    }
  };

  const handleShowGuestWinModal = async () => {
    if (processing || !gameState.allOrNothingPendingGuestWin) return;

    console.log('🟢 DEBUG: Guest win button clicked');
    try {
      setProcessing(true);
      await showAllOrNothingGuestWinModal();
      console.log('🟢 DEBUG: Guest win modal triggered successfully');
    } catch (error) {
      console.error('🔴 DEBUG: Guest win modal failed:', error);
      onError('Failed to show guest win modal');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleAllOrNothingModal = async () => {
    if (processing) return;

    console.log('🟡 DEBUG: Toggle button clicked');
    try {
      setProcessing(true);
      await toggleAllOrNothingModal();
      console.log('🟢 DEBUG: Toggle completed successfully');
    } catch (error) {
      console.error('🔴 DEBUG: Toggle failed:', error);
      onError('Failed to toggle modal');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleGuestVictoryModal = async () => {
    if (processing) return;

    console.log('🏆 DEBUG: Guest Victory toggle clicked');
    try {
      setProcessing(true);
      const { toggleGuestVictoryModal } = await import('@/utils/gameLogic');
      await toggleGuestVictoryModal();
      console.log('🎉 DEBUG: Guest Victory toggle completed');
    } catch (error) {
      console.error('❌ DEBUG: Guest Victory toggle failed:', error);
      onError('Failed to toggle guest victory modal');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleGuestLostModal = async () => {
    if (processing) return;

    console.log('💀 DEBUG: Guest Lost toggle clicked');
    try {
      setProcessing(true);
      const { toggleGuestLostModal } = await import('@/utils/gameLogic');
      await toggleGuestLostModal();
      console.log('💔 DEBUG: Guest Lost toggle completed');
    } catch (error) {
      console.error('❌ DEBUG: Guest Lost toggle failed:', error);
      onError('Failed to toggle guest lost modal');
    } finally {
      setProcessing(false);
    }
  };

  const handleAllOrNothingGuess = async (guess: 'A' | 'B' | 'C' | 'D') => {
    if (processing || !gameState.allOrNothingActive || !gameState.currentQuestion) return;

    try {
      setProcessing(true);
      
      const updates = GameLogic.handleAllOrNothingGuess(gameState, guess);
      
      await gameStateManager.updateGameState(updates);
      
    } catch (error) {
      onError('Failed to process All or Nothing guess');
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

      {/* Step 1: Panel Guess - Hide during All or Nothing */}
      {!gameState.allOrNothingActive && (
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
      )}

      {/* Step 2: Check Panel Guess - Hide during All or Nothing */}
      {!gameState.allOrNothingActive && (
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
      )}

      {/* Step 3: Reveal Guest Answer (conditional) - Hide during All or Nothing */}
      {!gameState.allOrNothingActive && (
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
      )}

      {/* Lock Controls - Hide during All or Nothing */}
      {!gameState.allOrNothingActive && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Lock Control</h3>
          {GameLogic.canPlaceLock(gameState) ? (
            <div className="space-y-3">
              {/* Lock Level Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Lock Level
                </label>
                <select
                  value={selectedLockLevel}
                  onChange={(e) => setSelectedLockLevel(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={processing}
                >
                  {PRIZE_TIERS.map((tier) => (
                    <option key={tier.level} value={tier.level}>
                      Level {tier.level} - {tier.displayText} (₹{tier.amount.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Place Lock Button */}
              <button
                onClick={handlePlaceLock}
                disabled={processing}
                className="w-full px-6 py-2 bg-purple-600 text-white rounded font-semibold hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? 'Placing...' : `Place Lock at ${PRIZE_TIERS.find(t => t.level === selectedLockLevel)?.displayText || '₹0'}`}
              </button>
            </div>
          ) : (
            <div className="text-gray-400">
              Lock not available (need to use immunity first)
            </div>
          )}
        </div>
      )}

      {/* All or Nothing Controls */}
      {GameLogic.canStartAllOrNothing(gameState) && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">🎰 All or Nothing</h3>
          <div className="bg-red-900 border border-red-600 rounded-lg p-4 mb-4">
            <div className="text-red-400 font-semibold mb-2">⚠️ Final Gamble Available</div>
            <div className="text-red-300 text-sm mb-3">
              Guest has lost all lives. Start All or Nothing phase for a chance to win ₹50,000 flat!
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Panel gets 2 attempts to answer correctly. If panel fails both, guest wins ₹50,000.
              If panel succeeds on either attempt, guest leaves with ₹0 (even locked money).
            </p>
            <button
              onClick={() => handleStartAllOrNothing()}
              disabled={processing}
              className="px-6 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {processing ? 'Starting...' : '🎰 Start All or Nothing'}
            </button>
            <p className="text-yellow-400 text-xs mt-2">Select a question after starting</p>
          </div>
        </div>
      )}

      {/* All or Nothing Game Flow */}
      {gameState.allOrNothingActive && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            🎰 All or Nothing - Attempt {gameState.allOrNothingAttempt}/2
          </h3>
          
          <div className="bg-red-900 border border-red-600 rounded-lg p-4 mb-4">
            <div className="text-yellow-400 font-semibold mb-2">
              Playing for: ₹50,000 FLAT
            </div>
            <div className="text-red-300 text-sm">
              Panel Attempt {gameState.allOrNothingAttempt} of 2
            </div>
          </div>

          {!gameState.currentQuestion ? (
            <div className="mb-4 p-4 bg-yellow-900 border border-yellow-600 rounded-lg">
              <div className="text-yellow-400 font-semibold mb-2">⚠️ No Question Selected</div>
              <div className="text-yellow-300 text-sm">
                Please select a question from the question pool below to continue All or Nothing.
              </div>
            </div>
          ) : (
            <>
              {/* Panel Guess Buttons */}
              <div className="mb-4">
                <h4 className="text-md font-semibold text-white mb-3">Panel Answer:</h4>
                <div className="flex gap-2">
                  {(['A', 'B', 'C', 'D'] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => handleAllOrNothingGuess(option)}
                      disabled={processing || !gameState.currentQuestion || gameState.panelGuessSubmitted || gameState.allOrNothingComplete}
                      className={`px-4 py-2 rounded font-semibold transition-colors ${
                        gameState.panelGuess === option
                          ? gameState.panelGuessChecked 
                            ? 'bg-orange-600 text-white'  // Locked answer
                            : 'bg-blue-600 text-white'     // Selected but not locked
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                
                {gameState.panelGuessChecked && gameState.currentQuestionAnswerRevealed && (
                  <div className="mt-3 p-3 rounded border">
                    {gameState.allOrNothingComplete ? (
                      gameState.allOrNothingWon ? (
                        <div className="bg-green-900 border-green-600 text-green-400">
                          🎉 GUEST WINS ₹50,000! Panel failed both attempts!
                        </div>
                      ) : (
                        <div className="bg-red-900 border-red-600 text-red-400">
                          💀 Game Over! Panel correct - Guest gets ₹0
                        </div>
                      )
                    ) : (
                      <div className="bg-blue-900 border-blue-600 text-blue-400">
                        ❌ Panel Wrong! Moving to Attempt 2...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Game Over Control - Show when guest has lost all lives */}
      {GameLogic.canTriggerGameOver(gameState) && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">💀 Game Control</h3>
          <div className="bg-red-900 border border-red-600 rounded-lg p-4">
            <div className="text-red-400 font-semibold mb-2">⚠️ Guest Eliminated</div>
            <div className="text-red-300 text-sm mb-3">
              Guest has lost all lives. Show the final game over screen to end the show.
            </div>
            <button
              onClick={handleTriggerGameOver}
              disabled={processing}
              className="px-6 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {processing ? 'Ending Game...' : '💀 Show Game Over'}
            </button>
          </div>
        </div>
      )}

      {/* All or Nothing Modal Controls */}
      {(gameState.allOrNothingPendingPanelWin || gameState.allOrNothingPendingGuestWin || gameState.allOrNothingModalVisible) && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">🎯 All or Nothing Controls</h3>

          {/* Smart Result Control - Always available once All or Nothing concludes */}
          {(() => {
            // Simple check: if we have any All or Nothing result (true or false), show the control
            const shouldShow = (gameState.allOrNothingWon === true || gameState.allOrNothingWon === false);
            console.log('🟣 DEBUG: Purple section render check:', {
              shouldShow,
              allOrNothingComplete: gameState.allOrNothingComplete,
              allOrNothingWon: gameState.allOrNothingWon,
              modalVisible: gameState.allOrNothingModalVisible,
              gameOver: gameState.gameOver
            });
            return shouldShow;
          })() && (
            <div className="bg-purple-900 border border-purple-600 rounded-lg p-4 mb-3">
              <div className="text-purple-400 font-semibold mb-2">
                🎭 Result Display
              </div>
              <div className="text-purple-300 text-sm mb-3">
                {gameState.allOrNothingModalVisible 
                  ? `Showing ${gameState.allOrNothingWon ? 'Guest Victory (₹50,000)' : 'Panel Victory (₹0)'} modal. Click to hide.`
                  : `Result ready: ${gameState.allOrNothingWon ? 'Guest Won!' : 'Panel Won!'}. Click to display.`
                }
              </div>
              <button
                onClick={handleToggleAllOrNothingModal}
                disabled={processing}
                className="px-6 py-2 bg-purple-600 text-white rounded font-semibold hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing 
                  ? 'Processing...' 
                  : gameState.allOrNothingModalVisible 
                    ? '🚫 Hide Result' 
                    : `🎭 Show ${gameState.allOrNothingWon ? '🎉 Guest Victory' : '💀 Panel Victory'}`
                }
              </button>
            </div>
          )}
        </div>
      )}

      {/* Guest Victory Modal Controls */}
      {gameState.guestVictoryPending && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">🏆 Guest Victory Controls</h3>
          <div className="bg-gradient-to-r from-yellow-900 to-green-900 p-4 rounded-lg">
            <div className="text-white text-sm mb-3">
              {gameState.lives === 0 && gameState.lock.placed ? (
                <>
                  🔒 <strong>Guest lost all lives but has locked ₹{gameState.lockedMoney.toLocaleString()}!</strong>
                  <br />
                  {gameState.guestVictoryModalVisible 
                    ? '✅ Lock Victory modal is currently shown to audience. Click to hide.'
                    : '⏳ Ready to celebrate! Click to show lock victory modal with confetti.'}
                </>
              ) : (
                <>
                  🎊 <strong>Guest won {gameState.questionsAnswered} questions and reached ₹{gameState.prize.toLocaleString()}!</strong>
                  <br />
                  📊 Current level: ₹{gameState.prize.toLocaleString()} | Lives: {gameState.lives} | Questions answered: {gameState.questionsAnswered}/7
                  {gameState.lock.placed && (
                    <>
                      <br />
                      🔓 Lock was placed at ₹{gameState.lockedMoney.toLocaleString()}, but guest WON with {gameState.lives} life remaining!
                    </>
                  )}
                  <br />
                  {gameState.guestVictoryModalVisible 
                    ? '✅ Guest Victory modal is currently shown to audience. Click to hide.'
                    : '⏳ Ready to celebrate! Click to show victory modal with confetti.'}
                </>
              )}
            </div>
            <button
              onClick={handleToggleGuestVictoryModal}
              disabled={processing}
              className="px-6 py-2 bg-purple-600 text-white rounded font-semibold hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {processing 
                ? 'Processing...' 
                : gameState.guestVictoryModalVisible 
                  ? '🚫 Hide Victory Modal' 
                  : (gameState.lives === 0 && gameState.lock.placed)
                    ? `🎉 Show Lock Victory (₹${gameState.lockedMoney.toLocaleString()})`
                    : `🎉 Show Guest Victory (₹${gameState.prize.toLocaleString()})`
              }
            </button>
          </div>
        </div>
      )}

      {/* Guest Lost Modal Controls */}
      {(() => {
        console.log('🔍 DEBUG Guest Lost Controls Check:', {
          guestLostPending: gameState.guestLostPending,
          lives: gameState.lives,
          softEliminated: gameState.softEliminated,
          lockPlaced: gameState.lock.placed
        });
        return gameState.guestLostPending;
      })() && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">💀 Guest Elimination Controls</h3>
          <div className="bg-gradient-to-r from-red-900 to-gray-900 p-4 rounded-lg">
            <div className="text-white text-sm mb-3">
              💔 <strong>Guest lost all lives without placing the lock!</strong>
              <br />
              {gameState.guestLostModalVisible 
                ? '✅ Guest elimination modal is currently shown to audience. Click to hide and show game over.'
                : '⏳ Ready to show elimination. Click to display guest elimination modal.'}
            </div>
            <button
              onClick={handleToggleGuestLostModal}
              disabled={processing}
              className="px-6 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {processing 
                ? 'Processing...' 
                : gameState.guestLostModalVisible 
                  ? '🚫 Hide & Show Game Over' 
                  : '💀 Show Guest Elimination'
              }
            </button>
          </div>
        </div>
      )}

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