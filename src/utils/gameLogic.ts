import type { GameState, Question, PrizeTier } from '@/lib/types';
import { PRIZE_TIERS } from '@/lib/firebase';
import { gameStateManager } from '@/lib/gameState';

export class GameLogic {
  /**
   * Calculate prize for given question level
   */
  static getPrizeForLevel(level: number): number {
    const tier = PRIZE_TIERS.find(t => t.level === level);
    return tier ? tier.amount : 0;
  }

  /**
   * Get current prize tier info
   */
  static getCurrentPrizeTier(gameState: GameState): PrizeTier | null {
    return PRIZE_TIERS.find(t => t.level === gameState.currentQuestionNumber) || null;
  }

  /**
   * Convert full text guest answer to letter format using question options
   */
  static normalizeGuestAnswer(guestAnswer: string, question: Question): string {
    const normalized = guestAnswer.trim().toUpperCase();
    
    // If it's already a letter, return as-is
    if (['A', 'B', 'C', 'D'].includes(normalized)) {
      return normalized;
    }
    
    // If it's full text, find matching option
    const options = [
      { letter: 'A', text: question.option_a.trim().toUpperCase() },
      { letter: 'B', text: question.option_b.trim().toUpperCase() },
      { letter: 'C', text: question.option_c.trim().toUpperCase() },
      { letter: 'D', text: question.option_d.trim().toUpperCase() }
    ];
    
    const match = options.find(opt => opt.text === normalized);
    if (match) {
      console.log(`🔄 Converted guest answer "${guestAnswer}" to "${match.letter}"`);
      return match.letter;
    }
    
    console.warn(`⚠️ Could not convert guest answer "${guestAnswer}" to letter format`);
    return normalized; // Return as-is if no match found
  }

  /**
   * Check if panel guess matches guest answer (with question context)
   */
  static isPanelGuessCorrectWithContext(panelGuess: string, guestAnswer: string, question: Question): boolean {
    if (!panelGuess || !guestAnswer) {
      console.error('Missing panel guess or guest answer:', { panelGuess, guestAnswer });
      return false;
    }
    
    const normalizedPanelGuess = panelGuess.toUpperCase();
    const normalizedGuestAnswer = this.normalizeGuestAnswer(guestAnswer, question);
    
    console.log('🔍 Comparing panel guess vs guest answer:', {
      panelGuess: normalizedPanelGuess,
      guestAnswer: normalizedGuestAnswer,
      originalGuestAnswer: guestAnswer,
      isMatch: normalizedPanelGuess === normalizedGuestAnswer
    });
    
    return normalizedPanelGuess === normalizedGuestAnswer;
  }

  /**
   * Check if panel guess matches guest answer
   */
  static isPanelGuessCorrect(panelGuess: string, guestAnswer: string): boolean {
    if (!panelGuess || !guestAnswer) {
      console.error('Missing panel guess or guest answer:', { panelGuess, guestAnswer });
      return false;
    }
    
    const normalizedPanelGuess = panelGuess.toUpperCase();
    let normalizedGuestAnswer = guestAnswer.toUpperCase();
    
    // Handle legacy data where guest_answer might be full text instead of letter
    // Convert full text answers back to letters by checking against current question options
    if (normalizedGuestAnswer.length > 1 && ['A', 'B', 'C', 'D'].includes(normalizedPanelGuess)) {
      // This is likely a full text answer, but we need the question context to convert it
      // For now, log this case for debugging
      console.warn('⚠️ Guest answer appears to be full text, not letter:', normalizedGuestAnswer);
    }
    
    console.log('🔍 Comparing panel guess vs guest answer:', {
      panelGuess: normalizedPanelGuess,
      guestAnswer: normalizedGuestAnswer,
      isMatch: normalizedPanelGuess === normalizedGuestAnswer
    });
    
    return normalizedPanelGuess === normalizedGuestAnswer;
  }

  /**
   * Determine if manual reveal is needed (panel ≠ guest)
   */
  static needsManualReveal(panelGuess: string, guestAnswer: string, question?: Question): boolean {
    if (!panelGuess || !guestAnswer) {
      return true; // If either is missing, require manual reveal
    }
    
    if (question) {
      return !this.isPanelGuessCorrectWithContext(panelGuess, guestAnswer, question);
    }
    
    return !this.isPanelGuessCorrect(panelGuess, guestAnswer);
  }

  /**
   * Calculate game state updates when panel guess is checked
   */
  static calculatePanelGuessResult(
    gameState: GameState, 
    panelGuess: string
  ): Partial<GameState> {
    if (!gameState.currentQuestion) {
      throw new Error('No current question');
    }

    if (!gameState.currentQuestion.guest_answer) {
      throw new Error('Current question missing guest_answer field');
    }

    const isPanelCorrect = this.isPanelGuessCorrectWithContext(
      panelGuess, 
      gameState.currentQuestion.guest_answer, 
      gameState.currentQuestion
    );
    const needsReveal = !isPanelCorrect; // Only need reveal if panel is WRONG

    let updates: Partial<GameState> = {
      panelGuessChecked: true,
      needsManualReveal: needsReveal
    };

    // If Panel = Guest (panel correct), complete the round immediately
    if (isPanelCorrect) {
      // Panel wins - guest loses a life and stays at current level
      updates.currentQuestionAnswerRevealed = true; // Mark as complete
      updates.panelCorrectAnswers = (gameState.panelCorrectAnswers || 0) + 1;
      
      // Guest loses a life when panel guesses correctly
      if (gameState.lives > 0) {
        const newLives = gameState.lives - 1;
        updates.lives = newLives;
        
        // Check if ALL lives are lost
        if (newLives === 0) {
          updates.softEliminated = true; // Eligible for All or Nothing, but don't end game yet
          
          console.log('💀 DEBUG: Lives reached 0 in calculatePanelGuessResult, checking lock status:', {
            'gameState.lock': gameState.lock,
            'gameState.lock.placed': gameState.lock.placed,
            'lockedMoney': gameState.lockedMoney
          });
          
          // Check scenarios when all lives are lost
          if (!gameState.lock.placed) {
            // No lock placed - Guest Lost scenario
            console.log('💀 GUEST LOST! All lives lost without placing the lock!');
            updates.guestLostPending = true;
          } else {
            // Lock was placed - Lock Victory scenario (guest wins locked amount)
            console.log('🏆 LOCK VICTORY! Guest lost all lives but has locked ₹' + gameState.lockedMoney);
            updates.guestVictoryPending = true;
            // Guest wins the locked amount
          }
        }
        
        console.log(`Panel correct! Guest loses a life. Lives remaining: ${newLives}`);
      }
      
      // Check if game should end (2 panel correct answers) - but only if All or Nothing not available
      if (updates.panelCorrectAnswers >= 2 && updates.lives > 0) {
        updates.gameOver = true;
        updates.softEliminated = true;
      }
      
      // Mark question as used
      updates.usedQuestions = {
        ...gameState.usedQuestions,
        [gameState.currentQuestion.id]: true
      };
      
      // Keep current question visible until new one is selected
      // Don't clear currentQuestion here - let the operator choose the next question
      // Reset only the panel guess state for next round
      updates.panelGuess = '';
      updates.panelGuessSubmitted = false;
      updates.panelGuessChecked = false;
    }
    // If Panel ≠ Guest (panel wrong), require manual reveal
    // (the reveal step will handle guest advancement)

    return updates;
  }

  /**
   * Calculate game state updates when guest answer is revealed
   */
  static calculateRevealResult(gameState: GameState): Partial<GameState> {
    if (!gameState.currentQuestion || !gameState.panelGuess) {
      throw new Error('Invalid state for reveal');
    }

    const isPanelCorrect = this.isPanelGuessCorrectWithContext(
      gameState.panelGuess, 
      gameState.currentQuestion.guest_answer, 
      gameState.currentQuestion
    );
    
    let updates: Partial<GameState> = {
      currentQuestionAnswerRevealed: true,
      needsManualReveal: false
    };

    if (!isPanelCorrect) {
      // Panel WRONG = Guest WINS the round! 🎉
      // Mark for advancement on next question selection
      const newQuestionsAnswered = gameState.questionsAnswered + 1;
      updates = {
        ...updates,
        questionsAnswered: newQuestionsAnswered,
        pendingAdvancement: true
        // Note: currentQuestionNumber and prize stay same until next question
      };
      
      console.log(`Guest wins round ${newQuestionsAnswered}! Advancement pending for next question selection.`);
      
      // Check for Guest Victory: Completed all 7 questions
      // This works for ALL scenarios:
      // 1. Guest wins all 7 questions in a row without lock → ₹50K victory
      // 2. Guest wins 7 questions WITH lock placed → Lock amount victory
      // 3. Guest reaches Q7, loses life(s), retries Q7, and wins (with or without lock)
      if (newQuestionsAnswered === 7) {
        console.log('🏆 GUEST VICTORY DETECTED!', {
          questionsAnswered: newQuestionsAnswered,
          currentLevel: gameState.currentQuestionNumber,
          lockPlaced: gameState.lock.placed,
          lockedMoney: gameState.lockedMoney,
          lives: gameState.lives,
          scenario: gameState.lock.placed 
            ? `Won with lock placed at ₹${gameState.lockedMoney}` 
            : 'Won all 7 without lock (₹50K)',
          detailedScenario: gameState.currentQuestionNumber === 7 
            ? 'Won 7th question (possibly with retries)' 
            : 'Advanced through all 7 levels'
        });
        updates.guestVictoryPending = true;
        // Don't set gameOver yet - let operator trigger the modal manually
        // When operator shows modal, it will set gameOver
      }
    } else {
      // Panel CORRECT = Panel wins
      // Guest stays at current level - no advancement, loses a life
      const newPanelCorrectCount = gameState.panelCorrectAnswers + 1;
      
      updates.panelCorrectAnswers = newPanelCorrectCount;
      
      // Guest loses a life when panel guesses correctly
      if (gameState.lives > 0) {
        const newLives = gameState.lives - 1;
        updates.lives = newLives;
        
        // Check if ALL lives are lost
        if (newLives === 0) {
          updates.softEliminated = true; // Eligible for All or Nothing, but don't end game yet
          
          console.log('💀 DEBUG: Lives reached 0, checking lock status:', {
            'gameState.lock': gameState.lock,
            'gameState.lock.placed': gameState.lock.placed,
            'typeof lock.placed': typeof gameState.lock.placed,
            'lock.placed === false': gameState.lock.placed === false,
            '!lock.placed': !gameState.lock.placed
          });
          
          // Check for Guest Lost: Lost all lives WITHOUT placing lock
          if (!gameState.lock.placed) {
            console.log('💀 GUEST LOST! All lives lost without placing the lock!');
            updates.guestLostPending = true;
            // Don't set gameOver yet - let operator trigger the modal manually
          } else {
            console.log('🔒 Lock was placed, NOT setting guestLostPending');
          }
        }
        
        console.log(`Panel correct! Guest loses a life. Lives remaining: ${newLives}`);
      }
      
      // Check if game should end (2 panel correct answers) - but only if All or Nothing not available
      if (newPanelCorrectCount >= 2 && updates.lives > 0) {
        updates.gameOver = true;
        updates.softEliminated = true;
      }
      
      console.log(`Panel got ${newPanelCorrectCount} correct answers! Game may end if panel reaches 2.`);
    }

    return updates;
  }

  /**
   * Mark question as used
   */
  static markQuestionAsUsed(gameState: GameState, questionId: string): Partial<GameState> {
    return {
      usedQuestions: {
        ...gameState.usedQuestions,
        [questionId]: true
      }
    };
  }

  /**
   * Check if question has been used
   */
  static isQuestionUsed(gameState: GameState, questionId: string): boolean {
    return !!gameState.usedQuestions[questionId];
  }

  /**
   * Check if lock can be placed
   */
  static canPlaceLock(gameState: GameState): boolean {
    // Lock is always available as long as it hasn't been placed yet and game isn't over
    return !gameState.lock.placed && !gameState.gameOver;
  }

  /**
   * Calculate lock placement
   */
  static calculateLockPlacement(gameState: GameState, level: number): Partial<GameState> {
    if (!this.canPlaceLock(gameState)) {
      throw new Error('Cannot place lock in current state');
    }

    const lockAmount = this.getPrizeForLevel(level);

    return {
      lock: {
        placed: true,
        level: level
      },
      lockedMoney: lockAmount
    };
  }

  /**
   * Check if game should end
   */
  static shouldGameEnd(gameState: GameState): boolean {
    // Game ends when panel gets 2 questions right (after soft elimination)
    return gameState.softEliminated || gameState.currentQuestionNumber > 7;
  }

  /**
   * Check if All or Nothing phase can be started
   */
  static canStartAllOrNothing(gameState: GameState): boolean {
    return gameState.lives === 0 && gameState.softEliminated && !gameState.allOrNothingActive && !gameState.allOrNothingComplete && !gameState.gameOver;
  }

  /**
   * Start All or Nothing phase (clear current question, operator will select)
   */
  static startAllOrNothing(gameState: GameState): Partial<GameState> {
    return {
      allOrNothingActive: true,
      allOrNothingAttempt: 1,
      allOrNothingComplete: false,
      allOrNothingWon: false,
      allOrNothingLastGuess: '',
      allOrNothingLastGuessCorrect: false,
      allOrNothingAttempt1Guess: '',
      allOrNothingAttempt1Correct: false,
      allOrNothingAttempt2Guess: '',
      allOrNothingAttempt2Correct: false,
      currentQuestion: null, // Clear question - operator will select one for both attempts
      panelGuess: '',
      panelGuessSubmitted: false,
      panelGuessChecked: false,
      currentQuestionAnswerRevealed: false,
      needsManualReveal: false
    };
  }

  /**
   * Handle All or Nothing panel guess
   */
  static handleAllOrNothingGuess(gameState: GameState, panelGuess: 'A' | 'B' | 'C' | 'D'): Partial<GameState> {
    if (!gameState.allOrNothingActive || !gameState.currentQuestion) {
      throw new Error('All or Nothing not active');
    }

    const isPanelCorrect = this.isPanelGuessCorrectWithContext(
      panelGuess,
      gameState.currentQuestion.guest_answer,
      gameState.currentQuestion
    );

    let updates: Partial<GameState> = {
      panelGuess,
      panelGuessSubmitted: true,
      panelGuessChecked: true,
      currentQuestionAnswerRevealed: true,
      allOrNothingLastGuess: panelGuess,
      allOrNothingLastGuessCorrect: isPanelCorrect
    };

    // Track attempt-specific data
    if (gameState.allOrNothingAttempt === 1) {
      updates.allOrNothingAttempt1Guess = panelGuess;
      updates.allOrNothingAttempt1Correct = isPanelCorrect;
    } else if (gameState.allOrNothingAttempt === 2) {
      updates.allOrNothingAttempt2Guess = panelGuess;
      updates.allOrNothingAttempt2Correct = isPanelCorrect;
    }

    if (isPanelCorrect) {
      // Panel correct - set pending state for operator control
      updates.allOrNothingPendingPanelWin = true;
      updates.allOrNothingWon = false; // Panel won
      updates.prize = 0; // Guest gets ₹0 (even if locked money exists)
      console.log(`All or Nothing: Panel correct on attempt ${gameState.allOrNothingAttempt}! Waiting for operator to show game over`);
    } else {
      // Panel wrong
      if (gameState.allOrNothingAttempt === 1) {
        // First attempt wrong - prepare for second attempt on SAME question
        updates.allOrNothingAttempt = 2;
        // Keep the same question - do NOT clear it
        updates.panelGuess = '';
        updates.panelGuessSubmitted = false;
        updates.panelGuessChecked = false;
        updates.currentQuestionAnswerRevealed = false;
        console.log('All or Nothing: Panel wrong on attempt 1! Moving to attempt 2 with same question');
      } else {
        // Second attempt wrong - set pending state for operator control
        updates.allOrNothingPendingGuestWin = true;
        updates.allOrNothingWon = true; // Guest won
        updates.prize = 50000; // Set final prize to ₹50,000
        console.log('All or Nothing: Panel wrong on attempt 2! Guest wins ₹50,000! Waiting for operator to show win modal');
      }
    }

    return updates;
  }

  /**
   * Calculate advancement when selecting new question
   */
  static calculateQuestionSelection(gameState: GameState, newQuestion: Question): Partial<GameState> {
    // If All or Nothing is active, just set the question without advancement logic
    if (gameState.allOrNothingActive) {
      return {
        currentQuestion: newQuestion,
        panelGuess: '',
        panelGuessSubmitted: false,
        panelGuessChecked: false,
        currentQuestionAnswerRevealed: false,
        needsManualReveal: false
      };
    }

    // Normal game logic
    let updates: Partial<GameState> = {
      currentQuestion: newQuestion,
      panelGuess: '',
      panelGuessSubmitted: false,
      panelGuessChecked: false,
      currentQuestionAnswerRevealed: false,
      needsManualReveal: false
    };

    // Check if guest should advance (pendingAdvancement flag is set)
    if (gameState.pendingAdvancement) {
      // Guest advances to next level
      const nextLevel = gameState.currentQuestionNumber + 1;
      const newPrize = this.getPrizeForLevel(nextLevel);
      
      updates.currentQuestionNumber = nextLevel;
      updates.prize = newPrize;
      updates.pendingAdvancement = false; // Clear the flag
      
      console.log(`Guest advances! Moving from level ${gameState.currentQuestionNumber} to ${nextLevel}, prize: ₹${newPrize}`);
    }

    // Mark question as used
    updates.usedQuestions = {
      ...gameState.usedQuestions,
      [newQuestion.id]: true
    };

    return updates;
  }

  /**
   * Manually trigger game over (operator control)
   */
  static triggerGameOver(gameState: GameState): Partial<GameState> {
    return {
      gameOver: true,
      pendingGameOver: false
    };
  }

  /**
   * Check if manual game over trigger should be available
   */
  static canTriggerGameOver(gameState: GameState): boolean {
    // Show generic game over control ONLY if:
    // - Guest is eliminated (lives = 0, softEliminated = true)
    // - BUT not if guestLostPending (we have a special modal for that)
    // - AND not if guestVictoryPending (we have a special modal for that too)
    const result = gameState.lives === 0 
      && gameState.softEliminated 
      && !gameState.gameOver 
      && !gameState.allOrNothingActive
      && !gameState.guestLostPending
      && !gameState.guestVictoryPending;
    
    console.log('🔍 DEBUG canTriggerGameOver:', {
      lives: gameState.lives,
      softEliminated: gameState.softEliminated,
      gameOver: gameState.gameOver,
      allOrNothingActive: gameState.allOrNothingActive,
      guestLostPending: gameState.guestLostPending,
      guestVictoryPending: gameState.guestVictoryPending,
      lockPlaced: gameState.lock.placed,
      result
    });
    
    return result;
  }
}

/**
 * Trigger All or Nothing panel win modal (guest loses, crying emoji rain)
 */
export async function showAllOrNothingPanelWinModal() {
  const updates: Partial<GameState> = {
    allOrNothingPendingPanelWin: false,
    allOrNothingModalVisible: true,
    allOrNothingComplete: true,
    allOrNothingWon: false,
    gameOver: true,
    prize: 0
  };
  await gameStateManager.updateGameState(updates);
}

/**
 * Trigger All or Nothing guest win modal (guest wins ₹50,000, confetti)
 */
export async function showAllOrNothingGuestWinModal() {
  const updates: Partial<GameState> = {
    allOrNothingPendingGuestWin: false,
    allOrNothingModalVisible: true,
    allOrNothingComplete: true,
    allOrNothingWon: true,
    gameOver: true,
    prize: 50000
  };
  await gameStateManager.updateGameState(updates);
}

/**
 * Smart toggle All or Nothing modal - shows appropriate result based on game outcome
 */
export async function toggleAllOrNothingModal() {
  const currentState = gameStateManager.getCurrentLocalState();
  if (!currentState) {
    console.error('🔴 DEBUG: No current state available');
    return;
  }
  
  console.log('🔵 DEBUG: Toggle function called with state:', {
    allOrNothingModalVisible: currentState.allOrNothingModalVisible,
    allOrNothingComplete: currentState.allOrNothingComplete,
    allOrNothingWon: currentState.allOrNothingWon,
    gameOver: currentState.gameOver,
    prize: currentState.prize
  });
  
  if (currentState.allOrNothingModalVisible) {
    // Currently visible - hide it but preserve all other state
    console.log('🟡 DEBUG: Hiding modal, preserving other state values');
    const updates: Partial<GameState> = {
      allOrNothingModalVisible: false
      // Don't change allOrNothingComplete, allOrNothingWon, gameOver, etc.
    };
    console.log('🟡 DEBUG: Updates to apply:', updates);
    await gameStateManager.updateGameState(updates);
    console.log('🟢 DEBUG: Hide operation completed');
  } else {
    // Currently hidden - show the appropriate result modal
    console.log('🟡 DEBUG: Showing modal based on allOrNothingWon:', currentState.allOrNothingWon);
    if (currentState.allOrNothingWon === true) {
      // Guest won - show guest win modal
      const updates: Partial<GameState> = {
        allOrNothingModalVisible: true,
        allOrNothingComplete: true,
        allOrNothingWon: true,
        gameOver: true,
        prize: 50000
      };
      console.log('🟢 DEBUG: Showing guest win modal with updates:', updates);
      await gameStateManager.updateGameState(updates);
    } else if (currentState.allOrNothingWon === false) {
      // Panel won - show panel win modal  
      const updates: Partial<GameState> = {
        allOrNothingModalVisible: true,
        allOrNothingComplete: true,
        allOrNothingWon: false,
        gameOver: true,
        prize: 0
      };
      console.log('🟢 DEBUG: Showing panel win modal with updates:', updates);
      await gameStateManager.updateGameState(updates);
    } else {
      console.error('🔴 DEBUG: Invalid allOrNothingWon value:', currentState.allOrNothingWon);
    }
  }
}

/**
 * Show or hide guest victory modal (for completing all 7 questions without lock)
 */
export async function toggleGuestVictoryModal() {
  const currentState = await gameStateManager.getCurrentGameState();
  if (!currentState) {
    console.error('No game state found');
    return;
  }

  console.log(' DEBUG: toggleGuestVictoryModal called, current modalVisible:', currentState.guestVictoryModalVisible);
  
  if (currentState.guestVictoryModalVisible) {
    // Currently visible - hide it
    console.log(' DEBUG: Hiding guest victory modal');
    const updates: Partial<GameState> = {
      guestVictoryModalVisible: false
    };
    await gameStateManager.updateGameState(updates);
    console.log(' DEBUG: Guest victory modal hidden');
  } else {
    // Currently hidden - show guest victory modal
    console.log('🏆 DEBUG: Showing guest victory modal');
    
    // Determine prize:
    // 1. If guest has lives remaining: Show current prize (they won the game!)
    // 2. If guest lost all lives (lives = 0) and lock placed: Show locked amount
    const prizeAmount = (currentState.lives === 0 && currentState.lock.placed) 
      ? currentState.lockedMoney 
      : currentState.prize;
    
    console.log('🏆 DEBUG: Prize calculation:', {
      lives: currentState.lives,
      lockPlaced: currentState.lock.placed,
      currentPrize: currentState.prize,
      lockedMoney: currentState.lockedMoney,
      prizeAmount,
      reason: (currentState.lives === 0 && currentState.lock.placed)
        ? 'Guest lost all lives - showing locked amount'
        : 'Guest won with lives remaining - showing current prize'
    });
    
    const updates: Partial<GameState> = {
      guestVictoryModalVisible: true,
      gameOver: true,
      prize: prizeAmount
    };
    await gameStateManager.updateGameState(updates);
    console.log(`🏆 DEBUG: Guest victory modal shown with ₹${prizeAmount} prize`);
  }
}


/**
 * Show or hide guest lost modal (for losing all lives without placing lock)
 */
export async function toggleGuestLostModal() {
  const currentState = await gameStateManager.getCurrentGameState();
  if (!currentState) {
    console.error('No game state found');
    return;
  }

  console.log(' DEBUG: toggleGuestLostModal called, current modalVisible:', currentState.guestLostModalVisible);
  
  if (currentState.guestLostModalVisible) {
    // Currently visible - hide it and show game over
    console.log(' DEBUG: Hiding guest lost modal, showing game over');
    const updates: Partial<GameState> = {
      guestLostModalVisible: false,
      gameOver: true
    };
    await gameStateManager.updateGameState(updates);
    console.log(' DEBUG: Guest lost modal hidden, game over shown');
  } else {
    // Currently hidden - show guest lost modal
    console.log(' DEBUG: Showing guest lost modal');
    const updates: Partial<GameState> = {
      guestLostModalVisible: true,
      prize: 0
    };
    await gameStateManager.updateGameState(updates);
    console.log(' DEBUG: Guest lost modal shown with ?0 prize');
  }
}
