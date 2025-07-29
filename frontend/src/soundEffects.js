// Sound Effects for Judge Me If You Can Game Show
class SoundEffects {
  constructor() {
    this.audioContext = null;
    this.sounds = {};
    this.isEnabled = true;
    this.init();
  }

  async init() {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Initialize sounds
      await this.createSounds();
      
      console.log('Sound effects initialized successfully');
    } catch (error) {
      console.warn('Sound effects could not be initialized:', error);
      this.isEnabled = false;
    }
  }

  async createSounds() {
    // Step 1: Panel guess submitted - Dramatic whoosh sound
    this.sounds.panelGuess = this.createWhooshSound(0.3, 0.8);
    
    // Step 2: Check panel guess - Tension building sound
    this.sounds.checkGuess = this.createTensionSound(0.4, 1.2);
    
    // Step 3: Reveal guest answer - Dramatic reveal sound
    this.sounds.revealAnswer = this.createRevealSound(0.5, 1.0);
    
    // Correct answer - Success chime
    this.sounds.correct = this.createSuccessSound(0.6, 0.8);
    
    // Wrong answer - Error sound
    this.sounds.wrong = this.createErrorSound(0.4, 0.6);
    
    // Lock placed - Metallic sound
    this.sounds.lockPlaced = this.createMetallicSound(0.3, 0.7);
    
    // Button click - UI feedback
    this.sounds.buttonClick = this.createClickSound(0.2, 0.4);
  }

  // Create a dramatic whoosh sound for panel guess
  createWhooshSound(volume = 0.3, duration = 0.8) {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + duration);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    return { oscillator, gainNode, duration };
  }

  // Create a tension building sound for checking guess
  createTensionSound(volume = 0.4, duration = 1.2) {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(300, this.audioContext.currentTime + duration);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.2);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    return { oscillator, gainNode, duration };
  }

  // Create a dramatic reveal sound
  createRevealSound(volume = 0.5, duration = 1.0) {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + duration);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    return { oscillator, gainNode, duration };
  }

  // Create a success chime for correct answers
  createSuccessSound(volume = 0.6, duration = 0.8) {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, this.audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, this.audioContext.currentTime + 0.2); // E5
    oscillator.frequency.setValueAtTime(783.99, this.audioContext.currentTime + 0.4); // G5
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    return { oscillator, gainNode, duration };
  }

  // Create an error sound for wrong answers
  createErrorSound(volume = 0.4, duration = 0.6) {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
    oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime + 0.2);
    oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    return { oscillator, gainNode, duration };
  }

  // Create a metallic sound for lock placement
  createMetallicSound(volume = 0.3, duration = 0.7) {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + duration);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    return { oscillator, gainNode, duration };
  }

  // Create a simple click sound for UI feedback
  createClickSound(volume = 0.2, duration = 0.4) {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + duration);
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    return { oscillator, gainNode, duration };
  }

  // Play a sound effect
  playSound(soundName) {
    if (!this.isEnabled || !this.sounds[soundName]) {
      return;
    }

    try {
      const sound = this.sounds[soundName];
      
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      // Create new instances to allow overlapping sounds
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Copy the sound properties
      oscillator.type = sound.oscillator.type;
      oscillator.frequency.setValueAtTime(sound.oscillator.frequency.value, this.audioContext.currentTime);
      
      // Apply frequency changes if they exist
      if (sound.oscillator.frequency._events) {
        sound.oscillator.frequency._events.forEach(event => {
          oscillator.frequency.setValueAtTime(event.value, this.audioContext.currentTime + event.time);
        });
      }
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(sound.gainNode.gain.value, this.audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + sound.duration);
      
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + sound.duration);
      
      console.log(`Playing sound: ${soundName}`);
    } catch (error) {
      console.warn(`Failed to play sound ${soundName}:`, error);
    }
  }

  // Toggle sound on/off
  toggleSound() {
    this.isEnabled = !this.isEnabled;
    console.log(`Sound effects ${this.isEnabled ? 'enabled' : 'disabled'}`);
    return this.isEnabled;
  }

  // Get sound status
  isSoundEnabled() {
    return this.isEnabled;
  }
}

// Create and export a singleton instance
const soundEffects = new SoundEffects();
export default soundEffects; 