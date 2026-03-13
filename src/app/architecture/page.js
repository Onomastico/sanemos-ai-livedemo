"use client";

import { useState } from 'react';
import { I18nProvider } from '@/i18n/I18nContext';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const AGENTS = [
  { id: 'sofia',  name: 'Sofía',  role: 'Welcome & Routing',   color: '#5FB7A6', emoji: '\uD83D\uDC4B', isReceptionist: true },
  { id: 'luna',   name: 'Luna',   role: 'Empathic Listening',  color: '#7B8FD4', emoji: '\uD83C\uDF19' },
  { id: 'marco',  name: 'Marco',  role: 'Grief Guide',         color: '#6B9E8A', emoji: '\uD83E\uDDED' },
  { id: 'serena', name: 'Serena', role: 'Mindfulness',         color: '#D4A574', emoji: '\uD83E\uDDD8' },
  { id: 'alma',   name: 'Alma',   role: 'Stories & Meaning',   color: '#C47D8A', emoji: '\uD83D\uDCD6' },
  { id: 'faro',   name: 'Faro',   role: 'Crisis Support',      color: '#E85D75', emoji: '\uD83D\uDEA8' },
  { id: 'nora',   name: 'Nora',   role: 'Pet Loss',            color: '#C9956C', emoji: '\uD83D\uDC3E' },
  { id: 'iris',   name: 'Iris',   role: 'Separation',          color: '#9D7BA8', emoji: '\uD83E\uDE77' },
];

const TOOL_GROUPS = [
  {
    title: 'Emotion Tools',
    color: '#F59E0B',
    tools: ['report_text_emotion', 'report_voice_emotion', 'report_facial_emotion'],
    notes: 'Excluded for Sofía (receptionist)',
  },
  {
    title: 'Session Tools',
    color: '#3B82F6',
    tools: ['end_session', 'switch_agent', 'escalate_to_crisis_faro'],
  },
  {
    title: 'UI Tools',
    color: '#8B5CF6',
    tools: ['generate_social_post', 'copy_to_clipboard', 'open_url', 'dismiss_modal'],
  },
  {
    title: 'Serena-only',
    color: '#D4A574',
    tools: ['start_breathing_exercise', 'stop_breathing_exercise'],
  },
  {
    title: 'Diary & Therapist',
    color: '#EC4899',
    tools: ['save_diary_entry', 'send_to_therapist', 'schedule_appointment'],
    notes: 'Excluded for Faro',
  },
  {
    title: 'Sofía-only',
    color: '#5FB7A6',
    tools: ['mark_onboarding_done'],
  },
];

const FEATURES = [
  'Real-time emotion tracking (text + voice + facial)',
  'Crisis detection & automatic escalation to Faro',
  'Voice-based agent switching',
  'Receptionist bot (Sofía) with onboarding & routing',
  'Personal Diary with localStorage persistence',
  'Therapist integration & appointment scheduling',
  'Social media post generation',
  'Breathing exercise visualization',
  'Session summary with AI recap',
  'PII masking on transcripts',
  'Internationalization (ES / EN)',
];

/* ------------------------------------------------------------------ */
/*  Tooltip                                                            */
/* ------------------------------------------------------------------ */

function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-gray-900 border border-white/20 text-xs text-gray-200 whitespace-nowrap shadow-xl pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 rotate-45 bg-gray-900 border-r border-b border-white/20" />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Animated dashed connector (vertical)                               */
/* ------------------------------------------------------------------ */

function DashedArrowDown({ label, className = '' }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg width="2" height="48" className="my-1">
        <line
          x1="1" y1="0" x2="1" y2="48"
          stroke="#555" strokeWidth="2" strokeDasharray="6 4"
        />
      </svg>
      {label && (
        <span className="text-[10px] text-gray-500 -mt-7 bg-black/80 px-1 rounded">
          {label}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Big horizontal arrow (WebSocket)                                   */
/* ------------------------------------------------------------------ */

function WebSocketArrow() {
  return (
    <div className="flex flex-col items-center justify-center px-2 sm:px-4 shrink-0 gap-1 self-center">
      {/* Arrow body */}
      <svg
        viewBox="0 0 180 48"
        className="w-[100px] sm:w-[160px] md:w-[180px]"
        fill="none"
      >
        {/* Top arrow (right) */}
        <line x1="0" y1="16" x2="150" y2="16" stroke="#9CCF6A" strokeWidth="2" strokeDasharray="8 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.5s" repeatCount="indefinite" />
        </line>
        <polygon points="150,10 166,16 150,22" fill="#9CCF6A" />

        {/* Bottom arrow (left) */}
        <line x1="166" y1="32" x2="16" y2="32" stroke="#5FB7A6" strokeWidth="2" strokeDasharray="8 4">
          <animate attributeName="stroke-dashoffset" from="0" to="24" dur="1.5s" repeatCount="indefinite" />
        </line>
        <polygon points="16,26 0,32 16,38" fill="#5FB7A6" />
      </svg>

      <div className="text-center leading-tight">
        <p className="text-[10px] sm:text-xs text-gray-400 font-mono break-all max-w-[160px]">
          wss://generativelanguage .googleapis.com/ws/...
        </p>
        <p className="text-[9px] text-gray-500 mt-0.5">
          Binary audio + JSON control
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section cards                                                      */
/* ------------------------------------------------------------------ */

function SectionCard({ title, color, glow, children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 relative overflow-hidden ${className}`}
      style={{
        borderColor: `${color}50`,
        background: `linear-gradient(135deg, ${color}10 0%, transparent 60%)`,
      }}
    >
      {glow && (
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10 blur-[60px] pointer-events-none"
          style={{ backgroundColor: color }}
        />
      )}
      <h3
        className="text-sm font-bold uppercase tracking-wider mb-4"
        style={{ color }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page content                                                       */
/* ------------------------------------------------------------------ */

function ArchitectureContent() {
  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#7B8FD4]/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Navigation */}
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-8 group"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="group-hover:underline">Back to Home</span>
        </a>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-2">
          System Architecture{' '}
          <span className="bg-gradient-to-r from-[#9CCF6A] to-[#5FB7A6] text-transparent bg-clip-text">
            Sanemos AI Live
          </span>
        </h1>
        <p className="text-gray-400 text-sm sm:text-base mb-10 max-w-2xl">
          Gemini Live Agent Challenge &mdash; real-time multimodal grief support powered by 7 specialized AI agents.
        </p>

        {/* ============================================================ */}
        {/*  Row 1: Client  <--->  Gemini API                            */}
        {/* ============================================================ */}
        <div className="flex flex-col lg:flex-row items-stretch gap-0 lg:gap-0 mb-4">
          {/* CLIENT */}
          <SectionCard
            title="Client Browser"
            color="#9CCF6A"
            glow
            className="flex-1 min-w-0"
          >
            <ul className="space-y-3 text-sm text-gray-300">
              <Tooltip text="React 18+ with App Router, server/client components">
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-[#9CCF6A]" />
                  <span><strong className="text-white">Next.js App</strong> &mdash; React front-end, App Router</span>
                </li>
              </Tooltip>
              <Tooltip text="Web Audio API, getUserMedia, 16 kHz mono PCM16 encoding">
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-[#9CCF6A]" />
                  <span><strong className="text-white">Audio Capture</strong> &mdash; 16 kHz PCM via Web Audio API</span>
                </li>
              </Tooltip>
              <Tooltip text="Dedicated 24 kHz AudioContext with gapless scheduled playback">
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-[#9CCF6A]" />
                  <span><strong className="text-white">Audio Playback</strong> &mdash; 24 kHz, gapless scheduling</span>
                </li>
              </Tooltip>
              <Tooltip text="Optional camera feed analyzed for facial emotion via Gemini vision">
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-[#9CCF6A]" />
                  <span><strong className="text-white">Camera Feed</strong> &mdash; optional facial emotion input</span>
                </li>
              </Tooltip>
              <Tooltip text="Client-side regex masking for names, emails, phones, SSNs before transcript storage">
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-[#9CCF6A]" />
                  <span><strong className="text-white">PII Scrubber</strong> &mdash; client-side regex masking</span>
                </li>
              </Tooltip>
            </ul>
          </SectionCard>

          {/* ARROW */}
          <WebSocketArrow />

          {/* GEMINI API */}
          <SectionCard
            title="Gemini Multimodal Live API"
            color="#5FB7A6"
            glow
            className="flex-1 min-w-0"
          >
            <ul className="space-y-3 text-sm text-gray-300">
              <Tooltip text="Latest native audio model with real-time voice I/O">
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-[#5FB7A6]" />
                  <span><strong className="text-white">Model</strong> &mdash; gemini-2.5-flash-native-audio-preview</span>
                </li>
              </Tooltip>
              <Tooltip text="Bidirectional streaming: audio in, audio out, no intermediate TTS/STT">
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-[#5FB7A6]" />
                  <span><strong className="text-white">Real-time Voice</strong> &mdash; voice-to-voice streaming</span>
                </li>
              </Tooltip>
              <Tooltip text="inputAudioTranscription + outputAudioTranscription at setup root level (camelCase)">
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-[#5FB7A6]" />
                  <span><strong className="text-white">Transcription</strong> &mdash; input &amp; output audio transcription</span>
                </li>
              </Tooltip>
              <Tooltip text="Function calling via tools declarations in setup; JSON responses trigger client actions">
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-[#5FB7A6]" />
                  <span><strong className="text-white">Function Calling</strong> &mdash; tool declarations &amp; invocations</span>
                </li>
              </Tooltip>
              <Tooltip text="System instructions define each agent's persona, behavior, and available tools">
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-[#5FB7A6]" />
                  <span><strong className="text-white">System Instructions</strong> &mdash; per-agent persona config</span>
                </li>
              </Tooltip>
            </ul>
          </SectionCard>
        </div>

        {/* Down arrow */}
        <div className="flex justify-center">
          <DashedArrowDown />
        </div>

        {/* ============================================================ */}
        {/*  Row 2: Agents                                               */}
        {/* ============================================================ */}
        <SectionCard title="7 AI Agents" color="#C47D8A" className="mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {AGENTS.map((a) => (
              <Tooltip key={a.id} text={a.role}>
                <div
                  className="rounded-xl border p-3 text-center transition-all duration-200 hover:scale-105 cursor-default"
                  style={{
                    borderColor: `${a.color}50`,
                    background: `linear-gradient(180deg, ${a.color}18 0%, transparent 100%)`,
                  }}
                >
                  <div className="text-2xl mb-1">{a.emoji}</div>
                  <div className="font-bold text-sm" style={{ color: a.color }}>
                    {a.name}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">
                    {a.role}
                  </div>
                </div>
              </Tooltip>
            ))}
          </div>
        </SectionCard>

        {/* Down arrow */}
        <div className="flex justify-center">
          <DashedArrowDown />
        </div>

        {/* ============================================================ */}
        {/*  Row 3: Tools + Features                                     */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Tool System — 2/3 width */}
          <SectionCard title="Tool System" color="#F59E0B" className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TOOL_GROUPS.map((g) => (
                <div key={g.title}>
                  <h4
                    className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: g.color }}
                  >
                    {g.title}
                  </h4>
                  <ul className="space-y-1">
                    {g.tools.map((t) => (
                      <li key={t} className="text-xs text-gray-400 font-mono flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: g.color }}
                        />
                        {t}
                      </li>
                    ))}
                  </ul>
                  {g.notes && (
                    <p className="text-[10px] text-gray-500 italic mt-2 border-t border-gray-700 pt-2">
                      {g.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Key Features — 1/3 width */}
          <SectionCard title="Key Features" color="#A78BFA">
            <ul className="space-y-2">
              {FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                  <svg
                    className="shrink-0 mt-0.5 w-3.5 h-3.5 text-[#A78BFA]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        {/* ============================================================ */}
        {/*  Data-flow legend                                            */}
        {/* ============================================================ */}
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">
            Data Flow Summary
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-gray-400">
            <div className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-[#9CCF6A]/20 flex items-center justify-center text-[#9CCF6A] font-bold text-[10px]">1</span>
              <span>User speaks or enables camera. Audio is captured at 16 kHz PCM and sent as binary frames over WebSocket.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-[#5FB7A6]/20 flex items-center justify-center text-[#5FB7A6] font-bold text-[10px]">2</span>
              <span>Gemini processes audio in real time, generates voice response, and streams 24 kHz audio back with transcription.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B] font-bold text-[10px]">3</span>
              <span>Gemini invokes tools (e.g., report_voice_emotion, switch_agent) via function calls. Client executes and responds.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-[#E85D75]/20 flex items-center justify-center text-[#E85D75] font-bold text-[10px]">4</span>
              <span>If crisis is detected, Faro agent is activated. WebSocket reconnects with Faro&apos;s system instructions and context.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pb-8 text-center text-xs text-gray-600">
          Sanemos AI Live &mdash; Gemini Live Agent Challenge &mdash; Devpost 2025
        </footer>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Export with I18nProvider wrapper                                    */
/* ------------------------------------------------------------------ */

export default function ArchitecturePage() {
  return (
    <I18nProvider>
      <ArchitectureContent />
    </I18nProvider>
  );
}
