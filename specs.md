# Sanemos Live AI Demo — Specifications

## Overview
Sanemos Live AI is a Next.js 16 web application that provides real-time, ultra-low latency multimodal emotional support for grief. It uses the Google Gemini Multimodal Live API (WebSocket `BidiGenerateContent`) for native voice-to-voice conversations with 8 specialized AI agents. Everything runs client-side — no intermediate server.

**Stack:** Next.js 16 · React 19 · Tailwind CSS v4 · Gemini Multimodal Live API (WebSocket) · Gemini REST API (summaries)

---

## Architecture & Features

### 1. Agent System (8 Agents)
- **Sofía** (receptionist): Welcome, routing, onboarding tour (10 topics). Flag: `isReceptionist: true`. Exclusive tool: `mark_onboarding_done`.
- **Luna**: Empathic listening and emotional validation.
- **Marco**: Grief education and psychoeducation.
- **Serena**: Mindfulness, breathing exercises, grounding. Exclusive tools: `start_breathing_exercise`, `stop_breathing_exercise`.
- **Alma**: Therapeutic narrative, storytelling, meaning-making.
- **Nora**: Pet loss support.
- **Iris**: Separation, divorce, identity transformation.
- **Faro** (crisis): Automatic escalation via `escalate_to_crisis_faro`. Red visual cues, crisis hotline banner, compassionate de-escalation. Excluded from emotion and diary/therapist tools.

Each agent has: custom `systemPrompt`, avatar PNG, theme color, voice name (Aoede/Orus/Kore/Leda/Fenrir), traits, and focus area.

### 2. Voice Conversation (Gemini Multimodal Live API)
- **Protocol:** WebSocket to `wss://generativelanguage.googleapis.com/ws/...BidiGenerateContent`
- **Model:** `gemini-2.5-flash-native-audio-preview-12-2025`
- **Audio capture:** 16 kHz mono PCM16 via Web Audio API ScriptProcessor → Base64 → `realtimeInput.mediaChunks`
- **Audio playback:** 24 kHz gapless scheduled playback with dedicated AudioContext
- **Transcription:** Bidirectional (`inputAudioTranscription` + `outputAudioTranscription`) with 600ms debounce on `turnComplete`
- **Video (optional):** Camera frames JPEG 320×240 @ 1 FPS sent as `realtimeInput.mediaChunks`

### 3. Tool System (Function Calling)
Tools are declared dynamically per agent via `buildFunctionDeclarations`:

| Scope | Tools |
|-------|-------|
| All agents | `escalate_to_crisis_faro`, `end_session`, `switch_agent`, `generate_social_post`, `copy_to_clipboard`, `open_url`, `dismiss_modal`, `show_diary`, `show_appointments` |
| All except Sofía | `report_text_emotion`, `report_voice_emotion`, `report_facial_emotion` (or unified `report_emotions`) |
| All except Faro | `save_diary_entry`, `send_to_therapist`, `schedule_appointment`, `book_appointment` |
| Serena only | `start_breathing_exercise`, `stop_breathing_exercise` |
| Sofía only | `mark_onboarding_done` |

**Destructive tools** (`end_session`, `switch_agent`, `escalate_to_crisis_faro`): do NOT send `toolResponse` (causes WS errors). All others send `toolResponse`.

**Safety checks:** `save_diary_entry` and `send_to_therapist` require `messages.length > 2` (real session).

### 4. Emotion Detection
- 3 emotion tools: text, voice, facial (or unified mode — configurable in Settings)
- 14 emotions: Sadness, Anger, Fear, Guilt, Hope, Calm, Love, Numbness, Concentration, Surprise, Joy, Anxiety, Confusion, Gratitude
- Emotion badge + intensity dots displayed below agent name
- Emotion-colored glow on background
- Timeline of emotions in session summary (EmotionTimeline component)
- Excluded for Sofía (receptionist, no emotional support)

### 5. Personal Diary
- **Storage:** localStorage (`sanemos_diary`)
- **Tool:** `save_diary_entry` — saves title, summary, transcript, emotion timeline
- **UI:** DiaryModal with expandable entries, delete with confirmation
- **Access:** Toolbar button on landing + voice command ("Show me my diary")
- Saveable from SessionSummary button or via Sofia's voice post-session review

### 6. Therapist & Appointments
- **Therapist:** Hardcoded Dr. María Torres (grief specialist, 15 years experience)
- **Tools:**
  - `send_to_therapist`: Opens modal to share session summary
  - `schedule_appointment`: Opens visual slot picker
  - `book_appointment`: Direct booking with `preferred_day` + `preferred_time` parameters
- **Slots:** Next 3 business days × 3 times (10:00, 15:00, 17:00)
- **Storage:** localStorage (`sanemos_appointments`)
- **UI:** TherapistModal (info + copy for email) + AppointmentModal (slot grid)

### 7. Session Summary
- Generated via Gemini REST API (`gemini-2.5-flash:generateContent`, 4096 max tokens)
- 4 sections: Emotional Summary, Key Themes, Resources, Closing Message
- Buttons: Copy, Save to Diary, Send to Therapist, Back to Home
- Closeable by voice via `dismiss_modal` tool (uses `dismissSummaryCallbackRef`)
- PII scrubbing NOT applied to AI-generated summary (causes false positives)

### 8. Receptionist Flow (Sofía)
- Activated by clicking Sofia's avatar circle on landing page
- Speech bubbles around avatar show example voice commands
- **First visit:** Detailed onboarding tour covering 10 topics (agents, voice commands, diary, therapist, appointments, social posts, breathing, camera, settings, privacy)
- **Post-session:** Receives transcript context, summarizes session, offers diary/therapist/appointment/switch options
- Uses `book_appointment` (with day+time) vs `schedule_appointment` (visual picker)

### 9. Breathing Exercises (Serena)
- Types: box, 4-7-8, simple
- BreathingVisualizer component with animated circle (expand/hold/contract)
- Phases: Inhale → Hold → Exhale → Rest (2s between cycles)
- Minimums enforced: 4s per phase, 4 cycles
- Not auto-dismissed — user clicks "Close" or voice command

### 10. PII Scrubbing
- Client-side masking with NER model (`lightweightNerModel.js`) + regex patterns
- Covers: phone numbers, emails, RUT/DNI, credit cards, person names, locations, health locations
- Applied to all transcripts in UI (history, live bubble, diary entries)
- NOT applied to AI-generated summaries

### 11. Internationalization (i18n)
- Languages: Spanish (ES) and English (EN)
- 150+ keys in `es.json` and `en.json`
- Key namespaces: `page.`, `session.`, `agents.`, `diary.`, `therapist.`, `appointment.`, `toast.`, `settings.`, `arch.`, `breathing.`, `emotions.`, `social.`, `summary.`, `onboarding.`, `contexts.`, `countries.`
- LanguageToggle pill component (ES/EN)
- Agents respond in the language the user speaks

### 12. Theme System (Dark / Light / System)
- ThemeProvider with 3 modes, persisted in localStorage (`sanemos_theme`)
- CSS variables: `.dark` and `.light` selectors with ~20 tokens each
- Tailwind v4 `@theme` registration for semantic color classes (`bg-bg`, `text-fg`, `text-accent`, etc.)
- FOUC prevention: inline `<script>` in `<head>` reads theme before hydration
- ThemeToggle pill component (sun/monitor/moon)

### 13. Architecture Page
- Interactive diagram at `/architecture`
- Full i18n support (60+ `arch.*` keys)
- ThemeToggle + LanguageToggle integrated
- Sections: Client ↔ Gemini API, 8 Agents, Tool System, Key Features, Data Flow

### 14. Access Gate
- Optional `NEXT_PUBLIC_ACCESS_CODE` env var
- Client-side comparison, persisted in `sessionStorage`
- If not set, demo is public

---

## User Interface

### Landing Page
- Access gate (optional)
- API key input with client-side note
- User profile selector (7 profiles: Orlando, Mary, Rodrigo, Carmen, Lucía, Pablo, custom)
- Country detection via ipapi.co
- Sofia avatar CTA with speech bubbles showing voice commands
- Agent grid inside Sofia's section container (Faro separated with red crisis styling)
- Toolbar: Settings, Diary, Appointments, Voice Commands, Theme Toggle, Language Toggle

### Session UI (GeminiLiveSession)
- Agent avatar with emotion badge and color glow
- Live subtitles (current speaker bubble with blinking cursor)
- Collapsible transcript panel (left side)
- Feature hint tooltips (Post, Breathe, Exit)
- Camera PIP preview (bottom-right corner)
- Audio visualizer bars
- Modals: SocialPost, Diary, Therapist, Appointment, AppointmentsView

### Session Summary
- Full-screen overlay with scrollable content
- AI-generated 4-section summary
- Emotion timeline visualization
- Action buttons: Copy, Save to Diary, Send to Therapist, Back to Home

---

## File Structure

```
src/
├── app/
│   ├── page.js                    # Landing: access gate, profiles, Sofia CTA, agent grid
│   ├── architecture/page.js       # Interactive architecture diagram (i18n + theme)
│   ├── layout.js                  # Root layout with FOUC prevention script
│   └── globals.css                # Tailwind v4 + CSS theme variables
├── components/
│   ├── GeminiLiveSession.js       # Session UI: avatar, emotions, transcript, modals
│   ├── SessionSummary.js          # Post-session AI summary + action buttons
│   ├── BreathingVisualizer.js     # Breathing exercise animation
│   ├── DiaryModal.js              # Personal diary modal
│   ├── TherapistModal.js          # Therapist info + copy for email
│   ├── AppointmentModal.js        # Appointment booking slot grid
│   ├── AppointmentsViewModal.js   # View scheduled appointments
│   ├── SocialPostModal.js         # Social media post modal
│   ├── EmotionTimeline.js         # Emotion timeline visualization
│   ├── LanguageToggle.js          # ES/EN toggle
│   ├── ThemeToggle.js             # Dark/Light/System toggle
│   ├── SettingsPanel.js           # API parameter tuning
│   └── OnboardingOverlay.js       # Visual onboarding overlay (legacy)
├── hooks/
│   └── useGeminiLive.js           # Core: WebSocket, audio, video, tools, state
├── lib/
│   ├── agents.js                  # 8 agents with systemPrompts
│   ├── diary.js                   # Diary CRUD + localStorage
│   ├── therapist.js               # Therapist data, slots, appointments
│   ├── userContexts.js            # User profiles + country detection
│   ├── piiScrubber.js             # PII masking (NER + regex)
│   └── lightweightNerModel.js     # Browser-safe NER model
├── theme/
│   └── ThemeContext.js            # ThemeProvider + useTheme
└── i18n/
    ├── I18nContext.js             # I18nProvider + useI18n
    ├── es.json                    # Spanish translations (150+ keys)
    └── en.json                    # English translations (150+ keys)
```

---

## Dependencies

| Package | Version | Usage |
|---------|---------|-------|
| next | 16.1.6 | Framework (Turbopack) |
| react | 19.2.3 | UI |
| tailwindcss | v4 | Styling (CSS-first, zero-config) |

All WebSocket, audio, and video is client-side native browser APIs.

---

## Deployment

### Local Development
```bash
npm run dev  # or: node node_modules/next/dist/bin/next dev
```

### Build
```bash
npm run build
```

### Google Cloud Run
```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions="_NEXT_PUBLIC_GEMINI_API_KEY=...,_NEXT_PUBLIC_ACCESS_CODE=..."
```

API key must NOT have HTTP Referrer restriction (WebSocket doesn't send Referer). Restrict to Generative Language API only.

---

## Google APIs Used

1. **Gemini Multimodal Live API** (WebSocket) — Real-time bidirectional voice with function calling
2. **Gemini REST API** (`gemini-2.5-flash:generateContent`) — Post-session summary generation
3. **Google Cloud Run** — Application hosting
