# Judge Me If You Can (JMYIC)

A live, in-person comedy game show application built with Next.js + Firebase.

## Roles & URLs

| Role | Path | Device |
|------|------|--------|
| Home / Role Selector | `/` | Any |
| Operator Panel | `/operator` | Tablet (backstage) |
| Audience Display | `/audience` | Large screen / TV |
| Play Along | `/play` | Audience members' phones |
| Leaderboard | `/leaderboard` | Host / brand segment screen |

---

## Local Development

```bash
# Install dependencies
npm install

# Run dev server (with Turbopack)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For staging environment:
```bash
npm run dev:staging
```

---

## Deploying to Firebase Hosting

> **Important:** Do NOT run plain `firebase deploy` — it will try to deploy Cloud Functions and fail because `functions/lib/index.js` hasn't been compiled.

### Standard deploy (hosting only)

This is the correct command for all UI and code changes:

```bash
# 1. Build the Next.js app (static export → out/)
npm run build

# 2. Deploy only hosting to Firebase
firebase deploy --only hosting
```

### Staging deploy

```bash
npm run build:staging && firebase deploy --only hosting
```

### Production deploy

```bash
npm run build:production && firebase deploy --only hosting
```

---

## Deploying Cloud Functions (rare)

Only needed when `functions/src/index.ts` has changed.

```bash
# 1. Build the functions TypeScript
cd functions
npm install
npm run build      # compiles → functions/lib/index.js
cd ..

# 2. Deploy everything (functions + hosting)
npm run build
firebase deploy
```

---

## Environment Files

| File | Used by |
|------|---------|
| `.env.local` | `npm run dev` |
| `.env.staging` | `npm run build:staging` |
| `.env.production` | `npm run build:production` |

Required variables (all `NEXT_PUBLIC_`):
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_ENVIRONMENT    # "local" | "staging" | "production"
```

---

## Operator Panel Password Setup (one-time)

The operator panel is protected by a SHA-256 hashed password. The password itself is never stored anywhere — only its hash is embedded in the build.

### Step 1: Generate the hash

Replace `YOUR_PASSWORD_HERE` with the password you want operators to use:

```bash
node -e "const c=require('crypto'); console.log(c.createHash('sha256').update('YOUR_PASSWORD_HERE').digest('hex'));"
```

### Step 2: Add the hash to every env file

Paste the output into `.env.local`, `.env.staging`, and `.env.production`:

```
NEXT_PUBLIC_OPERATOR_PASSWORD_HASH=<hash from step 1>
```

### How it works

- The hash is bundled into the static JS (since it's `NEXT_PUBLIC_`) but SHA-256 is one-way — an attacker cannot reverse it to get the password.
- Correct password → session stored in `sessionStorage` (tab-scoped, clears when tab closes).
- 5 wrong attempts → 30-second lockout.

---

## Firebase Console Setup (one-time)

For the **Play Along** feature to work, enable authentication providers in the Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com) → project `jmyic-ffc7a`
2. Authentication → Sign-in method
3. Enable **Google** and **Email/Password**

---

## Project Structure

```
JMYIC/
├── src/app/
│   ├── page.tsx              # Home — role selector
│   ├── operator/page.tsx     # Operator control panel
│   ├── audience/page.tsx     # Large-screen audience display
│   ├── play/page.tsx         # Play Along (audience phones)
│   └── leaderboard/page.tsx  # Leaderboard (brand segments)
├── src/components/
│   ├── operator/             # Operator UI components
│   ├── audience/             # Audience display components
│   └── playAlong/            # Play Along auth + answer UI
├── src/lib/
│   ├── firebase.ts           # Firestore init, defaults, prize tiers
│   ├── firebaseAuth.ts       # Firebase Auth (client-only, lazy-init)
│   ├── gameState.ts          # GameStateManager — Firestore sync
│   ├── types.ts              # TypeScript interfaces
│   └── sounds.ts             # SoundPlayer
├── src/utils/
│   └── gameLogic.ts          # All game logic (static methods)
├── functions/
│   └── src/index.ts          # Cloud Functions (health + backup)
└── public/sounds/            # Audio assets
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Build for production | `npm run build` |
| **Deploy to Firebase** | `npm run build && firebase deploy --only hosting` |
| Deploy functions only | `cd functions && npm run build && cd .. && firebase deploy --only functions` |
| View Firebase logs | `firebase functions:log` |
