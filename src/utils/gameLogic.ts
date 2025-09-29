import type { GameState, Question, PrizeTier } from '@/lib/types';
import { PRIZE_TIERS } from '@/lib/firebase';

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
      // Panel wins - guest stays at current level, loses a life, increment panel correct count
      updates.currentQuestionAnswerRevealed = true; // Mark as complete
      updates.panelCorrectAnswers = (gameState.panelCorrectAnswers || 0) + 1;
      
      // Guest loses a life when panel guesses correctly
      if (gameState.lives > 0 && !gameState.lifeUsed) {
        updates.lifeUsed = true;
        updates.lives = 0; // Set lives to 0 when life is used
      }
      
      // Check if game should end (2 panel correct answers)
      if (updates.panelCorrectAnswers >= 2) {
        updates.gameOver = true;
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

    const isPanelCorrect = this.isPanelGuessCorrect(gameState.panelGuess, gameState.currentQuestion.guest_answer);
    
    let updates: Partial<GameState> = {
      currentQuestionAnswerRevealed: true,
      needsManualReveal: false
    };

    if (!isPanelCorrect) {
      // Panel WRONG = Guest WINS! 🎉
      // Guest advances UP the prize ladder
      const nextLevel = gameState.currentQuestionNumber + 1;
      const newPrize = this.getPrizeForLevel(nextLevel);
      
      updates = {
        ...updates,
        currentQuestionNumber: nextLevel,
        prize: newPrize,
        questionsAnswered: gameState.questionsAnswered + 1
      };
      
      console.log(`Guest wins! Moving from level ${gameState.currentQuestionNumber} to ${nextLevel}, prize: ₹${newPrize}`);
    } else {
      // Panel CORRECT = Panel wins
      // Guest stays at current level - no advancement, loses a life
      const newPanelCorrectCount = gameState.panelCorrectAnswers + 1;
      
      updates.panelCorrectAnswers = newPanelCorrectCount;
      
      // Guest loses a life when panel guesses correctly
      if (gameState.lives > 0 && !gameState.lifeUsed) {
        updates.lifeUsed = true;
        updates.lives = 0; // Set lives to 0 when life is used
      }
      
      // Check if game should end (panel got 2 correct answers)
      if (newPanelCorrectCount >= 2) {
        updates.gameOver = true;
        console.log(`Panel got 2 correct answers! Game ends. Moving to Final Gamble.`);
      }
      
      console.log(`Panel guessed correctly! (${newPanelCorrectCount}/2) Guest stays at level ${gameState.currentQuestionNumber}, prize: ₹${gameState.prize}, life used: ${updates.lifeUsed}`);
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
}