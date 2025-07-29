// Basic backend server for Judge Me If You Can game show
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://frontend-jnga101ir-rajatbhands-projects.vercel.app',
    'https://frontend-pied-six-96.vercel.app',
    'https://*.vercel.app',
    'https://*.onrender.com',
    /^https:\/\/.*\.vercel\.app$/,
    /^https:\/\/.*\.onrender\.com$/
  ],
  credentials: true
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://frontend-jnga101ir-rajatbhands-projects.vercel.app',
      'https://frontend-pied-six-96.vercel.app',
      'https://*.vercel.app',
      'https://*.onrender.com',
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/.*\.onrender\.com$/
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Placeholder for game state
let gameState = {
  round: 'main_game', // 'main_game', 'final_gamble'
  questionIndex: 0,
  lock: {
    placed: false,
    question: null,
    shifted: false
  },
  correctCount: 0,
  prize: 0,
  finalGamble: {
    eligible: false,
    inProgress: false,
    question: '',
    answer: '',
    attempts: [],
    result: null
  },
  panelGuesses: [],
  guestAnswers: [],
  guestAnswerRevealed: [],
  questions: [
    { text: 'What is the guest\'s favorite color?', options: ['Red', 'Blue', 'Green', 'Yellow'], guestAnswer: 'Blue' },
    { text: 'Which city would the guest most like to visit?', options: ['Paris', 'Tokyo', 'New York', 'Sydney'], guestAnswer: 'Tokyo' },
    { text: 'What is the guest\'s spirit animal?', options: ['Cat', 'Dog', 'Eagle', 'Dolphin'], guestAnswer: 'Eagle' },
    { text: 'Which food does the guest hate?', options: ['Broccoli', 'Pizza', 'Chocolate', 'Fish'], guestAnswer: 'Broccoli' },
    { text: 'What is the guest\'s secret talent?', options: ['Singing', 'Dancing', 'Juggling', 'Magic'], guestAnswer: 'Singing' },
    { text: 'Which movie genre does the guest prefer?', options: ['Comedy', 'Horror', 'Drama', 'Action'], guestAnswer: 'Comedy' },
    { text: 'What is the guest\'s biggest fear?', options: ['Heights', 'Spiders', 'Darkness', 'Public Speaking'], guestAnswer: 'Heights' },
    { text: 'Which superpower would the guest choose?', options: ['Invisibility', 'Flying', 'Time Travel', 'Super Strength'], guestAnswer: 'Flying' },
    { text: 'What is the guest\'s favorite season?', options: ['Spring', 'Summer', 'Autumn', 'Winter'], guestAnswer: 'Autumn' },
    { text: 'Which hobby does the guest enjoy most?', options: ['Reading', 'Sports', 'Gaming', 'Cooking'], guestAnswer: 'Reading' }
  ]
};

// Broadcast game state to all clients
function broadcastState() {
  io.emit('game_state', gameState);
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  // Send current state on connect
  socket.emit('game_state', gameState);
  
  // Add connection event logging
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  // Test event to verify backend is working
  socket.on('test_event', () => {
    console.log('test_event: Received from client:', socket.id);
    socket.emit('test_response', { message: 'Backend is working!' });
  });

  // Listen for operator actions (to be expanded)
  socket.on('advance_round', (data) => {
    if (!data || !data.round) {
      socket.emit('error', { message: 'Invalid round data.' });
      console.error('advance_round: Invalid data', data);
      return;
    }
    console.log(`Advancing round to: ${data.round}`);
    // Advance to a specific round
    gameState.round = data.round;
    if (data.round === 'main_game') {
      gameState.questionIndex = 0;
      gameState.correctCount = 0;
      gameState.prize = 0;
      gameState.lock = { placed: false, question: null, shifted: false };
      gameState.finalGamble = {
        eligible: false,
        inProgress: false,
        question: '',
        answer: '',
        attempts: [],
        result: null
      };
    }
    broadcastState();
  });

  socket.on('advance_question', () => {
    if (gameState.round !== 'main_game') {
      socket.emit('error', { message: 'Cannot advance question outside main game.' });
      console.error('advance_question: Not in main_game round');
      return;
    }
    if (gameState.questionIndex >= 9) {
      socket.emit('error', { message: 'No more questions left.' });
      console.error('advance_question: No more questions');
      return;
    }
    gameState.questionIndex += 1;
    console.log(`Advanced to question ${gameState.questionIndex}`);
    broadcastState();
  });

  socket.on('select_panel_guess', (guess) => {
    if (gameState.round !== 'main_game') {
      socket.emit('error', { message: 'Cannot select guess outside main game.' });
      console.error('select_panel_guess: Not in main_game round');
      return;
    }
    if (typeof guess !== 'string' && typeof guess !== 'number') {
      socket.emit('error', { message: 'Invalid guess format.' });
      console.error('select_panel_guess: Invalid guess', guess);
      return;
    }
    if (!gameState.panelGuesses) gameState.panelGuesses = [];
    gameState.panelGuesses[gameState.questionIndex] = guess;
    console.log(`Panel guessed: ${guess} for Q${gameState.questionIndex + 1}`);
    
    // Don't auto-advance - let operator control the flow
    broadcastState();
  });

  socket.on('check_panel_guess', () => {
    console.log('check_panel_guess: Event received from client:', socket.id);
    
    if (gameState.round !== 'main_game') {
      socket.emit('error', { message: 'Cannot check panel guess outside main game.' });
      console.error('check_panel_guess: Not in main_game round');
      return;
    }
    
    console.log('check_panel_guess: Starting check...');
    console.log('check_panel_guess: Current question index:', gameState.questionIndex);
    console.log('check_panel_guess: Questions array:', gameState.questions);
    
    // Use the prefilled guest answer from the current question
    const currentQuestion = gameState.questions[gameState.questionIndex];
    console.log('check_panel_guess: Current question:', currentQuestion);
    
    const guestAnswer = currentQuestion ? currentQuestion.guestAnswer : null;
    console.log('check_panel_guess: Guest answer:', guestAnswer);
    
    if (!guestAnswer) {
      socket.emit('error', { message: 'No guest answer available to check against.' });
      console.error('check_panel_guess: No guest answer available');
      return;
    }
    
    if (!gameState.guestAnswers) gameState.guestAnswers = [];
    gameState.guestAnswers[gameState.questionIndex] = guestAnswer;
    
    // Add a flag to track that guest answer is loaded but not revealed
    if (!gameState.guestAnswerRevealed) gameState.guestAnswerRevealed = [];
    gameState.guestAnswerRevealed[gameState.questionIndex] = false;
    
    console.log('check_panel_guess: Guest answer loaded successfully');
    console.log('check_panel_guess: Updated guestAnswers array:', gameState.guestAnswers);
    console.log('check_panel_guess: Updated guestAnswerRevealed array:', gameState.guestAnswerRevealed);
    console.log('check_panel_guess: Broadcasting state update...');
    broadcastState();
    console.log('check_panel_guess: State broadcast complete');
  });

  socket.on('reveal_guest_answer', (answer) => {
    if (gameState.round !== 'main_game') {
      socket.emit('error', { message: 'Cannot reveal answer outside main game.' });
      console.error('reveal_guest_answer: Not in main_game round');
      return;
    }
    
    // Mark guest answer as revealed
    if (!gameState.guestAnswerRevealed) gameState.guestAnswerRevealed = [];
    gameState.guestAnswerRevealed[gameState.questionIndex] = true;
    
    console.log('reveal_guest_answer: Marked guest answer as revealed');
    console.log('reveal_guest_answer: Updated guestAnswerRevealed array:', gameState.guestAnswerRevealed);
    
    // Check if panel's guess matches guest's answer
    if (gameState.panelGuesses && gameState.guestAnswers && 
        gameState.panelGuesses[gameState.questionIndex] === gameState.guestAnswers[gameState.questionIndex]) {
      gameState.correctCount += 1;
      gameState.prize = Math.min(10000 * gameState.correctCount, 100000);
      console.log('Panel guessed correctly!');
    } else {
      console.log('Panel guessed incorrectly.');
    }
    
    // Game ends when panel gets 2 correct answers
    if (gameState.correctCount >= 2) {
      // Only offer Final Gamble if guest has placed a lock
      if (gameState.lock.placed) {
        gameState.round = 'final_gamble_offer';
        gameState.finalGamble.eligible = gameState.prize >= 40000;
        console.log('Game over: 2 correct answers with lock placed. Final Gamble eligibility:', gameState.finalGamble.eligible);
      } else {
        // Game ends without Final Gamble - guest wins 0
        gameState.round = 'game_over';
        gameState.prize = 0;
        console.log('Game over: 2 correct answers without lock placed. Guest wins 0.');
      }
    }
    broadcastState();
  });

  socket.on('place_lock', (questionIndex) => {
    if (gameState.questionIndex < 3) {
      socket.emit('error', { message: 'Cannot place lock before Q4.' });
      console.error('place_lock: Attempted before Q4');
      return;
    }
    if (typeof questionIndex !== 'number' || questionIndex < 4 || questionIndex > 10) {
      socket.emit('error', { message: 'Invalid lock question index (must be 4-10).' });
      console.error('place_lock: Invalid question index', questionIndex);
      return;
    }
    if (!gameState.lock.placed) {
      gameState.lock.placed = true;
      gameState.lock.question = questionIndex - 1; // Convert to 0-based index for storage
      gameState.lock.shifted = false;
      console.log(`Lock placed on Q${questionIndex}`);
    } else if (!gameState.lock.shifted) {
      gameState.lock.question = questionIndex - 1; // Convert to 0-based index for storage
      gameState.lock.shifted = true;
      console.log(`Lock shifted to Q${questionIndex}`);
    } else {
      socket.emit('error', { message: 'Lock can only be shifted once.' });
      console.error('place_lock: Lock already shifted');
      return;
    }
    broadcastState();
  });

  // Final Gamble: Offer, Question, Attempts, Result
  socket.on('final_gamble_offer', (accept) => {
    if (gameState.round !== 'final_gamble_offer') {
      socket.emit('error', { message: 'Not eligible for final gamble.' });
      console.error('final_gamble_offer: Not in offer round');
      return;
    }
    if (typeof accept !== 'boolean') {
      socket.emit('error', { message: 'Invalid accept value.' });
      console.error('final_gamble_offer: Invalid accept', accept);
      return;
    }
    gameState.finalGamble.inProgress = accept;
    if (!accept) {
      // Guest takes prize, round ends
      gameState.finalGamble.result = 'guest_wins';
      gameState.round = 'game_over';
      console.log('Guest declined final gamble. Guest wins.');
    } else {
      gameState.round = 'final_gamble';
      console.log('Guest accepted final gamble.');
    }
    broadcastState();
  });

  socket.on('final_gamble_question', (data) => {
    if (gameState.round !== 'final_gamble') {
      socket.emit('error', { message: 'Not in final gamble round.' });
      console.error('final_gamble_question: Not in final_gamble round');
      return;
    }
    if (!data || typeof data.question !== 'string' || typeof data.answer !== 'string') {
      socket.emit('error', { message: 'Invalid question or answer.' });
      console.error('final_gamble_question: Invalid data', data);
      return;
    }
    gameState.finalGamble.question = data.question;
    gameState.finalGamble.answer = data.answer;
    gameState.finalGamble.attempts = [];
    gameState.finalGamble.result = null;
    console.log('Final gamble question set.');
    broadcastState();
  });

  socket.on('final_gamble_attempt', (attempt) => {
    if (gameState.round !== 'final_gamble') {
      socket.emit('error', { message: 'Not in final gamble round.' });
      console.error('final_gamble_attempt: Not in final_gamble round');
      return;
    }
    if (typeof attempt !== 'string') {
      socket.emit('error', { message: 'Invalid attempt format.' });
      console.error('final_gamble_attempt: Invalid attempt', attempt);
      return;
    }
    if (gameState.finalGamble.attempts.length >= 2) {
      socket.emit('error', { message: 'No attempts left.' });
      console.error('final_gamble_attempt: Too many attempts');
      return;
    }
    gameState.finalGamble.attempts.push(attempt);
    if (attempt === gameState.finalGamble.answer) {
      gameState.finalGamble.result = 'panel_wins';
      gameState.round = 'game_over';
      console.log('Panel won the final gamble!');
    } else if (gameState.finalGamble.attempts.length === 2) {
      gameState.finalGamble.result = 'guest_wins';
      gameState.round = 'game_over';
      console.log('Guest won the final gamble!');
    } else {
      console.log('Final gamble attempt incorrect. Attempts left:', 2 - gameState.finalGamble.attempts.length);
    }
    broadcastState();
  });



  socket.on('reset_game', () => {
    console.log('Game reset to initial state.');
    // Reset the game to initial state
    gameState = {
      round: 'main_game',
      questionIndex: 0,
      lock: { placed: false, question: null, shifted: false },
      correctCount: 0,
      prize: 0,
      finalGamble: {
        eligible: false,
        inProgress: false,
        question: '',
        answer: '',
        attempts: [],
        result: null
      },
      panelGuesses: [],
      guestAnswers: [],
      guestAnswerRevealed: [],
      questions: [
        { text: 'What is the guest\'s favorite color?', options: ['Red', 'Blue', 'Green', 'Yellow'], guestAnswer: 'Blue' },
        { text: 'Which city would the guest most like to visit?', options: ['Paris', 'Tokyo', 'New York', 'Sydney'], guestAnswer: 'Tokyo' },
        { text: 'What is the guest\'s spirit animal?', options: ['Cat', 'Dog', 'Eagle', 'Dolphin'], guestAnswer: 'Eagle' },
        { text: 'Which food does the guest hate?', options: ['Broccoli', 'Pizza', 'Chocolate', 'Fish'], guestAnswer: 'Broccoli' },
        { text: 'What is the guest\'s secret talent?', options: ['Singing', 'Dancing', 'Juggling', 'Magic'], guestAnswer: 'Singing' },
        { text: 'Which movie genre does the guest prefer?', options: ['Comedy', 'Horror', 'Drama', 'Action'], guestAnswer: 'Comedy' },
        { text: 'What is the guest\'s biggest fear?', options: ['Heights', 'Spiders', 'Darkness', 'Public Speaking'], guestAnswer: 'Heights' },
        { text: 'Which superpower would the guest choose?', options: ['Invisibility', 'Flying', 'Time Travel', 'Super Strength'], guestAnswer: 'Flying' },
        { text: 'What is the guest\'s favorite season?', options: ['Spring', 'Summer', 'Autumn', 'Winter'], guestAnswer: 'Autumn' },
        { text: 'Which hobby does the guest enjoy most?', options: ['Reading', 'Sports', 'Gaming', 'Cooking'], guestAnswer: 'Reading' }
      ]
    };
    broadcastState();
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Add a simple health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Judge Me If You Can Backend is running',
    timestamp: new Date().toISOString()
  });
}); 