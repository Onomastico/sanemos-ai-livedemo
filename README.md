# Sanemos AI Live — Grief Support with Real-Time Voice AI

Sanemos AI Live is a grief support platform that provides real-time voice conversations with 8 specialized AI companions using the **Gemini Multimodal Live API** and the **Google GenAI SDK** (`@google/genai`).

Users can talk naturally, be interrupted, switch between agents, and access tools like a personal diary, therapist referral, appointment booking, breathing exercises, social media post generation, and more — all through voice.

**Category:** Live Agents | **Hackathon:** Gemini Live Agent Challenge

## Features

- **8 Specialized Agents** — Sofia (receptionist/router), Luna, Marco, Serena, Alma, Nora, Iris (grief companions), Faro (crisis)
- **Real-Time Voice** — Bidirectional audio via Gemini Live API with gapless playback (16kHz in / 24kHz out)
- **Vision Input** — Optional camera for facial emotion detection (JPEG 320x240 @ 1fps)
- **Emotion Detection** — Text, voice, and facial emotion tracking with timeline visualization
- **Personal Diary** — Save sessions to a local diary, view entries with summaries
- **Therapist Referral** — Send session summaries to a therapist, book appointments
- **Breathing Exercises** — Guided visualization (box, 4-7-8, simple) with Serena
- **Social Media Posts** — Generate commemorative posts for Facebook, Instagram, X
- **Post-Session Summary** — AI-generated recap with emotional analysis, themes, resources
- **Onboarding Tour** — Sofia guides new users through all 10 features by voice
- **i18n** — Full Spanish/English support (150+ translation keys)
- **Dark/Light/System Theme** — Persistent theme with FOUC prevention
- **Auto-Reconnect** — Transparent reconnection on session timeout (1008/1011)
- **Crisis Detection** — Automatic escalation to Faro crisis agent

## Tech Stack

| Technology | Usage |
|---|---|
| **Next.js 16** | Framework (React 19, Turbopack) |
| **@google/genai SDK** | Gemini Live API (voice sessions) + REST API (summaries) |
| **Gemini 2.5 Flash** | Native audio model for real-time conversation |
| **Tailwind CSS v4** | Styling |
| **Google Cloud Run** | Production hosting |
| **Google Cloud Build** | CI/CD pipeline |
| **Google Artifact Registry** | Container image storage |

## Architecture

Interactive architecture diagram available at `/architecture` in the app.

```
┌─────────────┐    WebSocket (Live API)    ┌──────────────────┐
│   Browser    │ ◄═══════════════════════► │  Gemini Live API  │
│  (Next.js)   │    @google/genai SDK      │  (Google Cloud)   │
│              │                           └──────────────────┘
│  8 Agents    │    REST API (Summary)     ┌──────────────────┐
│  Audio I/O   │ ─────────────────────────►│  Gemini 2.5 Flash │
│  Video I/O   │    @google/genai SDK      │  (Google Cloud)   │
│  Tools/UI    │                           └──────────────────┘
└──────┬───────┘
       │  Deployed on
       ▼
┌──────────────┐    ┌─────────────────┐    ┌───────────────────┐
│  Cloud Run   │◄───│  Cloud Build    │◄───│ Artifact Registry │
│ (us-central1)│    │  (CI/CD)        │    │ (Container images)│
└──────────────┘    └─────────────────┘    └───────────────────┘
```

## Getting Started

### Prerequisites

- **Node.js 20+**
- **Google Cloud API Key** with Generative Language API enabled
  - **Important:** Do NOT set HTTP Referrer restrictions (WebSocket doesn't send Referer)
  - Recommended: Restrict to Generative Language API only

### 1. Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/sanemos-live-demo.git
cd sanemos-live-demo
npm install
```

### 2. Configure Environment

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-api-key-here
NEXT_PUBLIC_ACCESS_CODE=optional-access-code-for-demo
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser (Chrome recommended for microphone/camera access).

### 4. Build for Production

```bash
npm run build
npm start
```

## Deploy to Google Cloud Run

The project includes automated deployment via Cloud Build:

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions="_NEXT_PUBLIC_GEMINI_API_KEY=your-key,_NEXT_PUBLIC_ACCESS_CODE=your-code"
```

This will:
1. Build a Docker image with `Dockerfile` (multi-stage Node.js 20 Alpine)
2. Push to Artifact Registry (`us-central1-docker.pkg.dev`)
3. Deploy to Cloud Run (512Mi, port 3000, unauthenticated)

Infrastructure-as-code files: [`cloudbuild.yaml`](cloudbuild.yaml) + [`Dockerfile`](Dockerfile)

## Google Cloud Services Used

| Service | Purpose |
|---|---|
| **Gemini Multimodal Live API** | Real-time bidirectional voice/video AI conversations |
| **Gemini REST API** | Post-session summary generation |
| **Cloud Run** | Serverless container hosting |
| **Cloud Build** | Automated CI/CD pipeline |
| **Artifact Registry** | Docker image storage |

## Project Structure

```
src/
├── hooks/useGeminiLive.js      # Core: SDK Live session, audio, tools
├── components/
│   ├── GeminiLiveSession.js    # Session UI, modals, transcription
│   ├── SessionSummary.js       # AI-generated post-session recap
│   ├── SocialPostModal.js      # Social media post display
│   ├── BreathingVisualizer.js  # Breathing exercise visualization
│   ├── DiaryModal.js           # Personal diary viewer
│   ├── TherapistModal.js       # Therapist referral
│   └── AppointmentModal.js     # Appointment booking
├── lib/
│   ├── agents.js               # 8 agent definitions + system prompts
│   ├── diary.js                # Diary CRUD (localStorage)
│   └── therapist.js            # Therapist data + appointment slots
├── i18n/                       # Spanish/English translations
└── theme/                      # Dark/Light/System theme
```

## License

Built for the [Gemini Live Agent Challenge](https://devpost.com) hackathon.

#GeminiLiveAgentChallenge
