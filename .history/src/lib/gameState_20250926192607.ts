import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, gameDocRef, defaultGameState } from './firebase';
import type { GameState, Question } from './types';

export class GameStateManager {
  private listeners: (() => void)[] = [];
  
  /**
   * Initialize game document if it doesn't exist
   */
  async initializeGame(): Promise<void> {
    try {
      const docSnap = await getDoc(gameDocRef);
      
      if (!docSnap.exists()) {
        await setDoc(gameDocRef, {
          ...defaultGameState,
          lastActivity: new Date().toISOString()
        });
        console.log('Game initialized successfully');
      }
    } catch (error) {
      console.error('Error initializing game:', error);
      throw new Error('Failed to initialize game');
    }
  }

  /**
   * Update game state with automatic lastActivity timestamp
   */
  async updateGameState(updates: Partial<GameState>): Promise<void> {
    try {
      const updatesWithTimestamp = {
        ...updates,
        lastActivity: new Date().toISOString()
      };

      await updateDoc(gameDocRef, updatesWithTimestamp);
      console.log('Game state updated:', Object.keys(updates));
    } catch (error) {
      console.error('Error updating game state:', error);
      throw new Error('Failed to update game state');
    }
  }

  /**
   * Get current game state
   */
  async getCurrentGameState(): Promise<GameState | null> {
    try {
      const docSnap = await getDoc(gameDocRef);
      return docSnap.exists() ? docSnap.data() as GameState : null;
    } catch (error) {
      console.error('Error getting game state:', error);
      return null;
    }
  }

  /**
   * Subscribe to real-time game state changes
   */
  subscribeToGameState(callback: (gameState: GameState | null) => void): () => void {
    const unsubscribe = onSnapshot(gameDocRef, 
      (doc) => {
        if (doc.exists()) {
          callback(doc.data() as GameState);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('Error in game state subscription:', error);
        callback(null);
      }
    );

    this.listeners.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Reset game to initial state (keep questions)
   */
  async resetGame(): Promise<void> {
    try {
      const currentState = await this.getCurrentGameState();
      
      await this.updateGameState({
        ...defaultGameState,
        // Preserve questions and some metadata
        usedQuestions: {}, // Reset used questions to allow reuse
        documentVersion: currentState?.documentVersion || '3.0'
      });
      
      console.log('Game reset successfully');
    } catch (error) {
      console.error('Error resetting game:', error);
      throw new Error('Failed to reset game');
    }
  }

  /**
   * Reset everything including questions - back to state zero
   */
  async resetEverything(): Promise<void> {
    try {
      // Reset to completely fresh state
      await setDoc(gameDocRef, {
        ...defaultGameState,
        lastActivity: new Date().toISOString(),
        documentVersion: '3.0'
      });
      
      console.log('Game state reset to zero successfully');
    } catch (error) {
      console.error('Error resetting game state:', error);
      throw new Error('Failed to reset game state');
    }
  }

  /**
   * Keep-alive heartbeat to prevent auto-reset during long discussions
   */
  startKeepAlive(): () => void {
    const interval = setInterval(async () => {
      try {
        await this.updateGameState({
          lastActivity: new Date().toISOString()
        });
        console.log('Keep-alive heartbeat sent');
      } catch (error) {
        console.error('Keep-alive error:', error);
      }
    }, 10 * 60 * 1000); // Every 10 minutes

    return () => clearInterval(interval);
  }

  /**
   * Clean up all listeners
   */
  cleanup(): void {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners = [];
  }
}

// Singleton instance
export const gameStateManager = new GameStateManager();