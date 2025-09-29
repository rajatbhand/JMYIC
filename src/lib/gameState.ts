import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp, SnapshotListenOptions } from 'firebase/firestore';
import { db, gameDocRef, defaultGameState } from './firebase';
import type { GameState, Question } from './types';

export class GameStateManager {
  private listeners: (() => void)[] = [];
  private currentState: GameState | null = null;
  
  /**
   * Initialize game document if it doesn't exist
   */
  async initializeGame(): Promise<void> {
    try {
      console.log('Checking for existing game document...');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore connection timeout')), 10000)
      );
      
      const docPromise = getDoc(gameDocRef);
      const docSnap = await Promise.race([docPromise, timeoutPromise]) as any;
      
      if (!docSnap.exists()) {
        console.log('Creating new game document...');
        
        await setDoc(gameDocRef, {
          ...defaultGameState,
          lastActivity: new Date().toISOString()
        });
        
        console.log('Game initialized successfully');
      } else {
        console.log('Game document already exists');
        this.currentState = docSnap.data() as GameState;
      }
    } catch (error) {
      console.error('Error initializing game:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new Error('Firebase connection timeout. Please check your internet connection.');
        } else if (error.message.includes('permission-denied')) {
          throw new Error('Firebase access denied. Please check permissions.');
        } else {
          throw new Error(`Failed to initialize game: ${error.message}`);
        }
      } else {
        throw new Error('Failed to initialize game');
      }
    }
  }

  /**
   * Update game state with optimistic local updates and faster sync
   */
  async updateGameState(updates: Partial<GameState>): Promise<void> {
    try {
      // Optimistic local update - immediately update local state for operator
      if (this.currentState) {
        this.currentState = { ...this.currentState, ...updates };
      }

      const updatesWithTimestamp = {
        ...updates,
        lastActivity: new Date().toISOString()
      };

      // Use more aggressive write settings for faster sync
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
   * Subscribe to real-time game state changes with optimized settings
   */
  subscribeToGameState(callback: (gameState: GameState | null) => void): () => void {
    // Configure listener for maximum real-time performance
    const options: SnapshotListenOptions = {
      includeMetadataChanges: false // Only get actual data changes, not metadata
    };

    const unsubscribe = onSnapshot(gameDocRef, options,
      (doc) => {
        if (doc.exists()) {
          const newState = doc.data() as GameState;
          this.currentState = newState;
          callback(newState);
        } else {
          this.currentState = null;
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
   * Get current local state (for immediate reads)
   */
  getCurrentLocalState(): GameState | null {
    return this.currentState;
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