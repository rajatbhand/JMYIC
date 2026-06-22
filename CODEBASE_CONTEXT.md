# Judge Me If You Can — Codebase Context

> This file exists so any AI session (or human) can regain full project context without re-exploring the code. Keep it up to date when major features change.

---

## 1. App Overview

**Judge Me If You Can (JMYIC)** is a live, in-person comedy game show application. A celebrity **Guest** answers 7 trivia questions. A comedy **Panel** tries to guess what the guest answered. The **Operator** runs the game from a tablet backstage. The **Audience** watches a large broadcast screen.

### Roles

| Role | URL | Purpose |
|------|-----|---------|
| Home | `/` | Role selector — links to Operator or Audience |
| Operator | `/operator` | Controls all game flow: questions, guesses, reveals, lifelines |
| Audience | `/audience` | Large-screen broadcast display — all visual feedback lives here |

---

## 2. Game Rules

### Core Loop (7 questions)
1. Operator selects a question from the pool.
2. Operator reveals options one-by-one (A/B/C/D) on the audience screen.
3. Panel discusses and the Operator submits their guess.
4. Operator checks the guess — compares panel guess to guest's pre-recorded answer.
5. Result determines advancement or life loss.
6. Repeat for all 7 questions.

### Lives
- Guest starts with **2 lives**.
- Panel correct → guest loses 1 life.
- Panel wrong → guest **advances** one prize level.
- 2 panel correct answers → **panel wins**, game ends.

### Prize Ladder (hard-coded in `src/lib/firebase.ts`)

| Level | Prize |
|-------|-------|
| 1 | ₹2,000 |
| 2 | ₹4,000 |
| 3 | ₹8,000 |
| 4 | ₹12,000 |
| 5 | ₹20,000 |
| 6 | ₹30,000 |
| 7 | ₹50,000 |

### Win / Loss Conditions

| Outcome | Trigger | Prize |
|---------|---------|-------|
| Guest Victory | Completes all 7 questions | Current prize (or locked amount) |
| Panel Victory | 2 correct panel answers | Guest eliminated |
| Guest Lost | Loses all lives, no lock placed | ₹0 |
| Lock Victory | Loses all lives, lock placed | Locked prize amount |
| All or Nothing Win | Panel fails both AoN attempts | ₹50,000 |
| All or Nothing Loss | Panel succeeds in AoN | ₹0 (lock forfeited) |

---

## 3. Lifelines & Special Mechanics

### Lock
- Operator places lock at any prize level (dropdown 1-7).
- If guest loses all lives WITH lock → wins locked amount (not ₹0).
- Lock is forfeited if panel wins All or Nothing.
- State: `lock: { placed: bool, level: number | null }`, `lockedMoney: number`

### All or Nothing (AoN)
- Triggered when guest hits 0 lives WITHOUT a lock.
- Guest gets **2 attempts** on a new question.
- Panel correct on either attempt → guest wins ₹0.
- Panel wrong on both attempts → guest wins ₹50,000.
- State: `allOrNothingActive`, `allOrNothingAttempt` (1|2), `allOrNothingWon`

### Hide Option (Lifeline)
- One-time use per game.
- Operator selects which option (A/B/C/D) to hide.
- Audience sees it vanish with a whoosh animation.
- State: `hiddenOption: 'A'|'B'|'C'|'D'|null`, `hideOptionUsed: boolean`

### Reveal Options (Progressive)
- Operator reveals options one at a time.
- Audience sees them appear left-to-right in reveal order.
- State: `revealedOptions: ('A'|'B'|'C'|'D')[]`
- Reset button hides all options again.

### 75:25 Banner
- Operator-controlled informational banner that slides up from the bottom of the audience screen.
- State: `show75_25Banner: boolean`

---

## 4. Directory Structure

```
JMYIC/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Home — role selector
│   │   ├── layout.tsx                # Root layout, fonts, metadata
│   │   ├── globals.css               # Global styles + CSS animations
│   │   ├── operator/page.tsx         # Operator panel page
│   │   ├── audience/page.tsx         # Audience display page
│   │   └── api/
│   │       ├── upload-csv/route.ts   # POST: parse + save CSV questions
│   │       └── questions/route.ts    # GET: fetch question pool
│   │
│   ├── components/
│   │   ├── operator/
│   │   │   ├── GameControls.tsx      # Main operator workflow hub (~840 lines)
│   │   │   ├── QuestionPool.tsx      # Question selection UI
│   │   │   ├── CSVUpload.tsx         # Drag-drop CSV upload
│   │   │   └── GameStatus.tsx        # Game state info dashboard
│   │   └── audience/
│   │       ├── QuestionDisplay.tsx   # Question + options with animations
│   │       ├── PrizeLadder.tsx       # Horizontal prize tier display
│   │       ├── LivesDisplay.tsx      # Heart icons for lives
│   │       ├── AllOrNothingDisplay.tsx    # Full-screen AoN phase UI
│   │       ├── GuestVictoryDisplay.tsx    # Win modal with confetti
│   │       ├── GuestLostDisplay.tsx       # Elimination modal
│   │       ├── GameOverDisplay.tsx        # Final game-over screen
│   │       └── SeventyFiveTwentyFiveBanner.tsx  # Slide-up info banner
│   │
│   ├── lib/
│   │   ├── firebase.ts               # Firebase init, prize tiers, default state
│   │   ├── gameState.ts              # GameStateManager class (Firestore sync)
│   │   ├── types.ts                  # TypeScript interfaces
│   │   └── sounds.ts                 # SoundPlayer class
│   │
│   └── utils/
│       └── gameLogic.ts              # GameLogic static methods (~770 lines)
│
├── functions/
│   └── src/index.ts                  # Firebase Cloud Functions (health + backup)
│
├── public/
│   └── sounds/                       # Audio assets (7 files)
│       ├── Correct.mp3
│       ├── Wrong.mp3
│       ├── buzzer.wav
│       ├── lock.mp3
│       ├── question-selection.mp3
│       ├── team-answer-reveal.mp3
│       └── whoosh.mp3
│
├── .env.local / .env.staging / .env.production
├── firebase.json                     # Hosting + functions config
├── next.config.ts                    # Static export config
├── tailwind.config.js
└── tsconfig.json
```

---

## 5. Critical Files

| File | Purpose | ~LOC |
|------|---------|------|
| `src/utils/gameLogic.ts` | All game logic — state transitions, win/loss, lock, AoN | 770 |
| `src/components/operator/GameControls.tsx` | Main operator UI and workflow | 840 |
| `src/lib/gameState.ts` | `GameStateManager` — Firestore sync, keep-alive | 196 |
| `src/lib/firebase.ts` | Firebase init, `PRIZE_TIERS`, default `GameState` | 97 |
| `src/lib/types.ts` | `Question`, `GameState`, `PrizeTier` interfaces | 110 |
| `src/lib/sounds.ts` | `SoundPlayer` — preload + fire-and-forget playback | 110 |
| `src/components/audience/AllOrNothingDisplay.tsx` | Full AoN phase display | 454 |
| `src/components/audience/QuestionDisplay.tsx` | Question + options + animations | 282 |
| `src/app/operator/page.tsx` | Operator page — 3-column layout, subscriptions | 264 |
| `src/app/audience/page.tsx` | Audience page — state routing, layout zones | 168 |
| `src/components/operator/CSVUpload.tsx` | CSV parse + Firebase save | 301 |
| `src/app/globals.css` | Whoosh animation, game-card gradient | 67 |

---

## 6. Architecture

### State Sync Model
- **Single Firestore document**: `games/game1` holds the entire `GameState`.
- **Singleton**: `gameStateManager` (from `src/lib/gameState.ts`) used globally.
- Both Operator and Audience subscribe via `subscribeToGameState()` (real-time listener).
- Operator gets optimistic local updates; Firestore syncs in background.
- Keep-alive: `startKeepAlive()` sends a heartbeat every 10 minutes to prevent auto-reset.

### Firebase Collections
| Collection | Document | Contents |
|-----------|----------|----------|
| `games` | `game1` | Full `GameState` object |
| `questions` | `pool` | All uploaded questions array |

### State Flow Diagram
```
[Operator selects question]
        ↓
[Audience sees question; operator reveals options A/B/C/D one-by-one]
        ↓
[Panel guesses → Operator submits guess]
        ↓
[Operator checks guess]
    ├─ PANEL CORRECT
    │   └─ Guest loses 1 life
    │       ├─ Lives > 0 → continue
    │       │   └─ 2 correct panel answers → Panel Wins
    │       └─ Lives = 0 → softEliminated
    │           ├─ Lock placed → Guest wins locked amount
    │           ├─ Start AoN → 2 attempts on new question
    │           │   ├─ AoN panel wrong × 2 → Guest wins ₹50K
    │           │   └─ AoN panel correct → Guest wins ₹0
    │           └─ No lock, skip AoN → Guest Lost (₹0)
    │
    └─ PANEL WRONG
        └─ Guest advances one prize level
            ├─ Level < 7 → next question
            └─ Level 7 complete → Guest Victory (wins current prize)
```

---

## 7. GameState Interface — Key Fields

```typescript
// Question & round
currentQuestion: Question | null
currentQuestionNumber: number          // 1–7
questionsAnswered: number

// Panel guessing
panelGuess: 'A'|'B'|'C'|'D'|''
panelGuessSubmitted: boolean
panelGuessChecked: boolean
panelCorrectAnswers: number            // 0–2; at 2 = panel wins

// Guest progression
lives: number                          // default 2
prize: number                          // current prize amount
softEliminated: boolean                // lives = 0, awaiting AoN or lost decision

// Lock system
lock: { placed: boolean, level: number | null }
lockedMoney: number

// Answer reveal
currentQuestionAnswerRevealed: boolean
needsManualReveal: boolean

// Lifelines
hiddenOption: 'A'|'B'|'C'|'D'|null
hideOptionUsed: boolean
revealedOptions: ('A'|'B'|'C'|'D')[]  // ordered; audience shows in this order

// All or Nothing
allOrNothingActive: boolean
allOrNothingAttempt: 0|1|2
allOrNothingComplete: boolean
allOrNothingWon: boolean
allOrNothingModalVisible: boolean
allOrNothingLastGuess: string
allOrNothingLastGuessCorrect: boolean

// Victory / loss pending (operator triggers modal manually)
guestVictoryPending: boolean
guestLostPending: boolean
guestVictoryModalVisible: boolean
guestLostModalVisible: boolean

// Operator flow flags
pendingAdvancement: boolean            // guest advanced, waiting for next question select
pendingGameOver: boolean
gameOver: boolean
buzzerTrigger: number                  // timestamp; audience detects change to play buzzer
show75_25Banner: boolean

// Data management
usedQuestions: Record<string, boolean>
lastActivity: string                   // ISO timestamp for keep-alive
documentVersion: string                // '3.0'
```

---

## 8. Game Logic Methods (`src/utils/gameLogic.ts`)

All methods are **static** on the `GameLogic` class.

| Method | What it does |
|--------|-------------|
| `isPanelGuessCorrectWithContext()` | Compare panel guess to guest answer using question context (handles letter + full-text) |
| `normalizeGuestAnswer()` | Convert full-text answer to A/B/C/D letter |
| `needsManualReveal()` | Returns true if panel ≠ guest (operator must reveal) |
| `calculatePanelGuessResult()` | When operator checks guess: update lives, auto-reveal if match, set `softEliminated` |
| `calculateRevealResult()` | When operator reveals answer: handle guest advancement, set `pendingAdvancement`, `guestVictoryPending`, `guestLostPending` |
| `calculateQuestionSelection()` | When new question selected: apply `pendingAdvancement`, update level & prize, mark question used |
| `canPlaceLock()` | Returns true if lock not yet placed and game active |
| `calculateLockPlacement()` | Stores lock level + prize amount |
| `canStartAllOrNothing()` | Returns true if `softEliminated && !lock.placed && !allOrNothingActive` |
| `startAllOrNothing()` | Clears question, initializes attempt 1 |
| `handleAllOrNothingGuess()` | Processes attempt 1/2; sets `allOrNothingWon` and `prize` on completion |
| `toggleGuestVictoryModal()` | Flips `guestVictoryModalVisible` |
| `toggleGuestLostModal()` | Flips `guestLostModalVisible` |
| `toggleAllOrNothingModal()` | Flips `allOrNothingModalVisible` |
| `getPrizeForLevel()` | Returns prize amount for a given level |
| `getCurrentPrizeTier()` | Returns full `PrizeTier` object for current level |

---

## 9. Audio System (`src/lib/sounds.ts`)

`SoundPlayer` is a singleton. Preloads all sounds on page load via `preloadSounds()`. Plays via Web Audio API with HTML5 Audio fallback. Volume: 0.7.

| Sound Key | File | Trigger |
|-----------|------|---------|
| `questionSelection` | `question-selection.mp3` | New question selected, option revealed, panel selects option |
| `panelCorrect` | `Correct.mp3` | Panel guess correct, Guest Victory modal |
| `panelWrong` | `Wrong.mp3` | Panel guess wrong, Guest Lost modal |
| `revealAnswer` | `team-answer-reveal.mp3` | Guest answer revealed |
| `lockPlaced` | `lock.mp3` | Lock placement confirmed |
| `buzzer` | `buzzer.wav` | Operator triggers buzzer |
| `whoosh` | `whoosh.mp3` | Hide Option lifeline — option vanishes |

---

## 10. Operator Workflow (Per Round)

1. **Select question** from Question Pool → audience sees question text.
2. **Reveal options** one at a time (A → B → C → D) using the reveal buttons.
3. **Submit panel guess** (A/B/C/D buttons).
4. **Check guess** → auto-reveals if panel matched guest, otherwise shows "Reveal Answer" button.
5. *(If needed)* **Reveal guest answer** → handles advancement or life loss.
6. *(Optional)* Use **Hide Option** (one-time, select which letter to vanish).
7. *(Optional)* Place **Lock** at current level via dropdown.
8. If `softEliminated`: choose **Start All or Nothing** or **Game Over**.
9. If AoN: select a question, submit attempt 1 guess, then attempt 2 guess.
10. When complete: operator manually triggers **result modals** (Victory / Lost / AoN result).

---

## 11. Audience Display Layout

```
┌─────────────────────────────────────┐  12vh
│  Lives (hearts) │  JMYIC  │  Lock  │
├─────────────────────────────────────┤  20vh
│       Prize Ladder (horizontal)     │
├─────────────────────────────────────┤  65vh
│     Question + Options (2×2 grid)   │
│   Options revealed left-to-right    │
└─────────────────────────────────────┘
          ↑ 75:25 Banner slides up from bottom
```

### Audience Page State Routing (priority order)
1. Loading spinner
2. `allOrNothingActive` → `<AllOrNothingDisplay />`
3. `guestVictoryModalVisible` → `<GuestVictoryDisplay />`
4. `guestLostModalVisible` → `<GuestLostDisplay />`
5. `gameOver` → `<GameOverDisplay />`
6. Default → Question + PrizeLadder + LivesDisplay + SeventyFiveTwentyFiveBanner

### Option Display Logic (`QuestionDisplay.tsx`)
- Options only visible if they appear in `revealedOptions`.
- Color coding:
  - Default: yellow/gold
  - Panel guessed: blue highlight
  - Correct after reveal: green
  - Wrong after reveal: red
  - Hidden: animated out with `.animate-whoosh-out` (scale + blur + fade, 0.4s)

---

## 12. CSV Question Format

```csv
question,option_a,option_b,option_c,option_d,guest_answer
"What is 2+2?","4","5","3","6","A"
```

- All 6 columns required.
- `guest_answer` must be exactly `A`, `B`, `C`, or `D`.
- Questions are **appended** to the existing pool on upload (not replaced).
- Each question gets ID: `q_${timestamp}_${index}`.
- Saved to Firestore `questions/pool`.

---

## 13. Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15.5.4 (App Router) |
| Language | TypeScript 4.9 |
| Styling | Tailwind CSS 4.1.13 + PostCSS |
| Database | Firebase Firestore (real-time) |
| Audio | Web Audio API + HTML5 Audio fallback |
| Animations | Tailwind + canvas-confetti 1.9.3 |
| CSV Parsing | PapaParse 5.5.3 |
| Fonts | Bebas Neue (display), Inter (body) |
| Deployment | Firebase Hosting (static) + Cloud Functions |

---

## 14. Environment & Deployment

### Environment Variables (all `NEXT_PUBLIC_`)
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_ENVIRONMENT    # "local" | "staging" | "production"
```

### Build & Deploy
- `next.config.ts`: `output: 'export'` → static files in `out/`
- `firebase.json`: Hosting serves `out/`, rewrites all routes to `index.html` (SPA)
- Firebase Project ID: `jmyic-ffc7a`
- Game document: `games/game1` (single instance)
- Questions document: `questions/pool`
- Document schema version: `'3.0'` (tracked for migrations)

---

## 15. Recent Development Focus (from git log)

- **Reveal options feature** — progressive per-option reveal with order tracking
- **Hide option animation** — whoosh animation + sound when option is hidden
- **Audio fixes** — synchronization of sound triggers across state changes
- **All or Nothing UI** — attempt-based option highlighting and result modals
- **Bug fixes** — edge cases in guess checking, answer normalization, life tracking
