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

// Function to generate random questions (now returns empty array)
function generateRandomQuestions() {
  // Return empty array - no sample questions
  return [];
}

// Placeholder for game state
let gameState = {
  round: 'setup', // 'setup', 'main_game', 'final_gamble'
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
  // Question pool (25 questions maximum) - starts empty
  questionPool: generateRandomQuestions(),
  // Currently selected question
  currentQuestion: null,
  // Track used questions
  usedQuestions: [],
  // Game progress
  questionsAnswered: 0,
  // NEW: Track selected questions in order (for progression highlighting)
  selectedQuestions: [],
  // NEW: Current question number (1-7) for progression tracking
  currentQuestionNumber: 0,
  // NEW: Scoring system
  score: {
    correctAnswers: 0,
    totalQuestions: 0,
    currentPrize: 0
  },
  mismatchCount: 0, // NEW: count mismatches for prize
};

// Helper function to get current question
function getCurrentQuestion() {
  return gameState.currentQuestion;
}

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

  // New Flow: Question Setup and Selection
  socket.on('add_question_to_pool', (questionData) => {
    if (!questionData || typeof questionData.text !== 'string' || !Array.isArray(questionData.options) || typeof questionData.guestAnswer !== 'string') {
      socket.emit('error', { message: 'Invalid question data. Must include text, options array, and guestAnswer.' });
      console.error('add_question_to_pool: Invalid data', questionData);
      return;
    }
    
    if (questionData.options.length !== 4) {
      socket.emit('error', { message: 'Question must have exactly 4 options.' });
      console.error('add_question_to_pool: Invalid options count', questionData.options.length);
      return;
    }
    
    if (gameState.questionPool.length >= 25) {
      socket.emit('error', { message: 'Maximum 25 questions allowed in pool.' });
      console.error('add_question_to_pool: Too many questions');
      return;
    }
    
    // Validate that guestAnswer is one of the options
    if (!questionData.options.includes(questionData.guestAnswer)) {
      socket.emit('error', { message: 'Guest answer must be one of the provided options.' });
      console.error('add_question_to_pool: Invalid guest answer');
      return;
    }
    
    const newQuestion = {
      id: Date.now() + Math.random(), // Unique ID
      text: questionData.text,
      options: questionData.options,
      guestAnswer: questionData.guestAnswer
    };
    
    gameState.questionPool.push(newQuestion);
    console.log(`Question added to pool: ${questionData.text}`);
    broadcastState();
  });

  socket.on('remove_question_from_pool', (questionId) => {
    const index = gameState.questionPool.findIndex(q => q.id === questionId);
    if (index === -1) {
      socket.emit('error', { message: 'Question not found in pool.' });
      console.error('remove_question_from_pool: Question not found', questionId);
      return;
    }
    
    const removedQuestion = gameState.questionPool.splice(index, 1)[0];
    console.log(`Question removed from pool: ${removedQuestion.text}`);
    broadcastState();
  });

  socket.on('select_question_from_pool', (questionId) => {
    const question = gameState.questionPool.find(q => q.id === questionId);
    if (!question) {
      socket.emit('error', { message: 'Question not found in pool.' });
      console.error('select_question_from_pool: Question not found', questionId);
      return;
    }
    
    // Check if question has already been used
    if (gameState.usedQuestions.includes(questionId)) {
      socket.emit('error', { message: 'Question has already been used.' });
      console.error('select_question_from_pool: Question already used', questionId);
      return;
    }
    
    // NEW: Track the order of selected questions for progression
    if (!gameState.selectedQuestions.includes(questionId)) {
      gameState.selectedQuestions.push(questionId);
    }
    
    // NEW: Set current question number (1-7) based on selection order
    gameState.currentQuestionNumber = gameState.selectedQuestions.length;
    
    gameState.currentQuestion = question;
    gameState.usedQuestions.push(questionId);
    gameState.questionsAnswered += 1;
    
    // Reset current question state
    gameState.panelGuesses[gameState.questionsAnswered - 1] = null;
    gameState.guestAnswers[gameState.questionsAnswered - 1] = null;
    gameState.guestAnswerRevealed[gameState.questionsAnswered - 1] = false;
    
    console.log(`Question ${gameState.currentQuestionNumber} selected from pool: ${question.text}`);
    broadcastState();
  });

  socket.on('start_game', () => {
    if (gameState.questionPool.length === 0) {
      socket.emit('error', { message: 'No questions in pool. Add at least one question before starting.' });
      console.error('start_game: No questions in pool');
      return;
    }
    
    gameState.round = 'main_game';
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
    gameState.currentQuestion = null;
    gameState.usedQuestions = [];
    gameState.questionsAnswered = 0;
    // NEW: Reset progression tracking
    gameState.selectedQuestions = [];
    gameState.currentQuestionNumber = 0;
    // NEW: Reset scoring
    gameState.score = {
      correctAnswers: 0,
      totalQuestions: 0,
      currentPrize: 0
    };
    gameState.mismatchCount = 0; // Reset mismatch count
    
    console.log('Game started with question pool');
    broadcastState();
  });

  socket.on('get_question_pool', () => {
    socket.emit('question_pool', {
      questions: gameState.questionPool,
      usedQuestions: gameState.usedQuestions,
      currentQuestion: gameState.currentQuestion
    });
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
      // NEW: Reset progression tracking when starting main game
      gameState.selectedQuestions = [];
      gameState.currentQuestionNumber = 0;
      // NEW: Reset scoring
      gameState.score = {
        correctAnswers: 0,
        totalQuestions: 0,
        currentPrize: 0
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
    if (!gameState.currentQuestion) {
      socket.emit('error', { message: 'No question selected. Please select a question first.' });
      console.error('select_panel_guess: No question selected');
      return;
    }
    if (typeof guess !== 'string' && typeof guess !== 'number') {
      socket.emit('error', { message: 'Invalid guess format.' });
      console.error('select_panel_guess: Invalid guess', guess);
      return;
    }
    if (!gameState.panelGuesses) gameState.panelGuesses = [];
    gameState.panelGuesses[gameState.questionsAnswered - 1] = guess;
    console.log(`Panel guessed: ${guess} for current question`);
    
    broadcastState();
  });

  socket.on('check_panel_guess', () => {
    console.log('check_panel_guess: Event received from client:', socket.id);
    
    if (gameState.round !== 'main_game') {
      socket.emit('error', { message: 'Cannot check panel guess outside main game.' });
      console.error('check_panel_guess: Not in main_game round');
      return;
    }
    
    if (!gameState.currentQuestion) {
      socket.emit('error', { message: 'No question selected. Please select a question first.' });
      console.error('check_panel_guess: No question selected');
      return;
    }
    
    console.log('check_panel_guess: Starting check...');
    
    const currentQuestion = getCurrentQuestion();
    console.log('check_panel_guess: Current question:', currentQuestion);
    
    const guestAnswer = currentQuestion ? currentQuestion.guestAnswer : null;
    console.log('check_panel_guess: Guest answer:', guestAnswer);
    
    if (!guestAnswer) {
      socket.emit('error', { message: 'No guest answer available to check against.' });
      console.error('check_panel_guess: No guest answer available');
      return;
    }
    
    if (!gameState.guestAnswers) gameState.guestAnswers = [];
    gameState.guestAnswers[gameState.questionsAnswered - 1] = guestAnswer;
    
    // Add a flag to track that guest answer is loaded but not revealed
    if (!gameState.guestAnswerRevealed) gameState.guestAnswerRevealed = [];
    gameState.guestAnswerRevealed[gameState.questionsAnswered - 1] = false;
    
    console.log('check_panel_guess: Guest answer loaded successfully');
    console.log('check_panel_guess: Updated guestAnswers array:', gameState.guestAnswers);
    console.log('check_panel_guess: Updated guestAnswerRevealed array:', gameState.guestAnswerRevealed);
    console.log('check_panel_guess: Broadcasting state update...');
    broadcastState();
    console.log('check_panel_guess: State broadcast complete');
  });

  socket.on('reveal_guest_answer', () => {
    if (gameState.round !== 'main_game') {
      socket.emit('error', { message: 'Cannot reveal answer outside main game.' });
      console.error('reveal_guest_answer: Not in main_game round');
      return;
    }
    
    if (!gameState.currentQuestion) {
      socket.emit('error', { message: 'No question selected. Please select a question first.' });
      console.error('reveal_guest_answer: No question selected');
      return;
    }
    
    // Mark guest answer as revealed
    if (!gameState.guestAnswerRevealed) gameState.guestAnswerRevealed = [];
    gameState.guestAnswerRevealed[gameState.questionsAnswered - 1] = true;
    
    console.log('reveal_guest_answer: Marked guest answer as revealed');
    console.log('reveal_guest_answer: Updated guestAnswerRevealed array:', gameState.guestAnswerRevealed);
    
    // NEW: Update scoring system
    gameState.score.totalQuestions += 1;
    
    // Check if panel's guess matches guest's answer
    if (gameState.panelGuesses && gameState.guestAnswers && 
        gameState.panelGuesses[gameState.questionsAnswered - 1] === gameState.guestAnswers[gameState.questionsAnswered - 1]) {
      gameState.correctCount += 1;
      gameState.prize = Math.min(10000 * gameState.correctCount, 100000);
      gameState.score.correctAnswers += 1;
      gameState.score.currentPrize = gameState.prize;
      console.log('Panel guessed correctly! Score updated.');
    } else {
      console.log('Panel guessed incorrectly.');
    }
    
    // Prize logic: only add for mismatches
    const idx = gameState.questionsAnswered - 1;
    if (
      gameState.panelGuesses &&
      gameState.guestAnswers &&
      gameState.panelGuesses[idx] !== undefined &&
      gameState.guestAnswers[idx] !== undefined &&
      gameState.panelGuesses[idx] !== gameState.guestAnswers[idx]
    ) {
      // Mismatch: add prize
      gameState.mismatchCount = (gameState.mismatchCount || 0) + 1;
      gameState.prize = Math.min(10000 * gameState.mismatchCount, 100000);
      gameState.score.currentPrize = gameState.prize;
      console.log('Panel and guest answers mismatched! Prize updated.');
    } else {
      console.log('Panel and guest answers matched. No prize added.');
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
        gameState.score.currentPrize = 0;
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

  // Question Management System
  socket.on('add_custom_question', (questionData) => {
    if (!questionData || typeof questionData.text !== 'string' || !Array.isArray(questionData.options) || typeof questionData.guestAnswer !== 'string') {
      socket.emit('error', { message: 'Invalid question data. Must include text, options array, and guestAnswer.' });
      console.error('add_custom_question: Invalid data', questionData);
      return;
    }
    
    if (gameState.customQuestions.length >= 25) {
      socket.emit('error', { message: 'Maximum 25 custom questions allowed.' });
      console.error('add_custom_question: Too many questions');
      return;
    }
    
    // Validate that guestAnswer is one of the options
    if (!questionData.options.includes(questionData.guestAnswer)) {
      socket.emit('error', { message: 'Guest answer must be one of the provided options.' });
      console.error('add_custom_question: Invalid guest answer');
      return;
    }
    
    const newQuestion = {
      text: questionData.text,
      options: questionData.options,
      guestAnswer: questionData.guestAnswer
    };
    
    gameState.customQuestions.push(newQuestion);
    console.log(`Custom question added: ${questionData.text}`);
    broadcastState();
  });

  socket.on('remove_custom_question', (questionIndex) => {
    if (typeof questionIndex !== 'number' || questionIndex < 0 || questionIndex >= gameState.customQuestions.length) {
      socket.emit('error', { message: 'Invalid question index.' });
      console.error('remove_custom_question: Invalid index', questionIndex);
      return;
    }
    
    const removedQuestion = gameState.customQuestions.splice(questionIndex, 1)[0];
    console.log(`Custom question removed: ${removedQuestion.text}`);
    broadcastState();
  });

  socket.on('set_question_sequence', (sequenceData) => {
    if (!sequenceData || !Array.isArray(sequenceData.questionIndices)) {
      socket.emit('error', { message: 'Invalid sequence data. Must include questionIndices array.' });
      console.error('set_question_sequence: Invalid data', sequenceData);
      return;
    }
    
    // Validate indices
    const maxCustomIndex = gameState.customQuestions.length - 1;
    const maxDefaultIndex = gameState.questions.length - 1;
    
    for (let i = 0; i < sequenceData.questionIndices.length; i++) {
      const item = sequenceData.questionIndices[i];
      if (!item || typeof item.type !== 'string' || typeof item.index !== 'number') {
        socket.emit('error', { message: `Invalid question item at index ${i}. Must include type and index.` });
        return;
      }
      
      if (item.type === 'custom' && (item.index < 0 || item.index > maxCustomIndex)) {
        socket.emit('error', { message: `Invalid custom question index: ${item.index}` });
        return;
      }
      
      if (item.type === 'default' && (item.index < 0 || item.index > maxDefaultIndex)) {
        socket.emit('error', { message: `Invalid default question index: ${item.index}` });
        return;
      }
    }
    
    gameState.currentQuestionSequence = sequenceData.questionIndices;
    console.log('Question sequence updated:', sequenceData.questionIndices);
    broadcastState();
  });

  socket.on('use_default_questions', () => {
    gameState.currentQuestionSequence = [];
    console.log('Switched to default questions');
    broadcastState();
  });

  socket.on('get_available_questions', () => {
    socket.emit('available_questions', {
      default: gameState.questions,
      custom: gameState.customQuestions,
      currentSequence: gameState.currentQuestionSequence
    });
  });

  socket.on('reset_game', () => {
    console.log('Game reset to initial state.');
    // Reset the game to initial state with new random questions
    gameState = {
      round: 'setup',
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
      questionPool: generateRandomQuestions(), // Generate new random questions
      currentQuestion: null,
      usedQuestions: [],
      questionsAnswered: 0,
      // NEW: Reset progression tracking
      selectedQuestions: [],
      currentQuestionNumber: 0,
      // NEW: Reset scoring
      score: {
        correctAnswers: 0,
        totalQuestions: 0,
        currentPrize: 0
      },
      mismatchCount: 0, // Reset mismatch count
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