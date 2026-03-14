"use client";

import { useState } from 'react';
import { I18nProvider, useI18n } from '@/i18n/I18nContext';
import { ThemeProvider } from '@/theme/ThemeContext';
import LanguageToggle from '@/components/LanguageToggle';
import ThemeToggle from '@/components/ThemeToggle';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const AGENTS = [
  { id: 'sofia',  name: 'Sofía',  roleKey: 'arch.agentSofia',  color: '#5FB7A6', emoji: '👋', isReceptionist: true },
  { id: 'luna',   name: 'Luna',   roleKey: 'arch.agentLuna',   color: '#7B8FD4', emoji: '🌙' },
  { id: 'marco',  name: 'Marco',  roleKey: 'arch.agentMarco',  color: '#6B9E8A', emoji: '🧭' },
  { id: 'serena', name: 'Serena', roleKey: 'arch.agentSerena', color: '#D4A574', emoji: '🧘' },
  { id: 'alma',   name: 'Alma',   roleKey: 'arch.agentAlma',   color: '#C47D8A', emoji: '📖' },
  { id: 'nora',   name: 'Nora',   roleKey: 'arch.agentNora',   color: '#C9956C', emoji: '🐾' },
  { id: 'iris',   name: 'Iris',   roleKey: 'arch.agentIris',   color: '#9D7BA8', emoji: '🩷' },
  { id: 'faro',   name: 'Faro',   roleKey: 'arch.agentFaro',   color: '#E85D75', emoji: '🚨' },
];

const TOOL_GROUPS = [
  {
    titleKey: 'arch.toolsEmotion',
    color: '#F59E0B',
    tools: ['report_text_emotion', 'report_voice_emotion', 'report_facial_emotion'],
    notesKey: 'arch.toolsEmotionNote',
  },
  {
    titleKey: 'arch.toolsSession',
    color: '#3B82F6',
    tools: ['end_session', 'switch_agent', 'escalate_to_crisis_faro'],
  },
  {
    titleKey: 'arch.toolsUI',
    color: '#8B5CF6',
    tools: ['generate_social_post', 'copy_to_clipboard', 'open_url', 'dismiss_modal'],
  },
  {
    titleKey: 'arch.toolsSerena',
    color: '#D4A574',
    tools: ['start_breathing_exercise', 'stop_breathing_exercise'],
  },
  {
    titleKey: 'arch.toolsDiary',
    color: '#EC4899',
    tools: ['save_diary_entry', 'send_to_therapist', 'schedule_appointment', 'book_appointment', 'show_diary', 'show_appointments'],
    notesKey: 'arch.toolsDiaryNote',
  },
  {
    titleKey: 'arch.toolsSofia',
    color: '#5FB7A6',
    tools: ['mark_onboarding_done'],
  },
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
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-surface border border-border text-xs text-fg-secondary whitespace-nowrap shadow-xl pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 rotate-45 bg-surface border-r border-b border-border" />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Animated dashed connector (vertical)                               */
/* ------------------------------------------------------------------ */

function DashedArrowDown() {
  return (
    <div className="flex flex-col items-center">
      <svg width="2" height="48" className="my-1">
        <line
          x1="1" y1="0" x2="1" y2="48"
          stroke="var(--fg-secondary)" strokeWidth="2" strokeDasharray="6 4"
        />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Big horizontal arrow (WebSocket)                                   */
/* ------------------------------------------------------------------ */

function WebSocketArrow() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center px-2 sm:px-4 shrink-0 gap-1 self-center">
      <svg
        viewBox="0 0 180 48"
        className="w-25 sm:w-40 md:w-45"
        fill="none"
      >
        <line x1="0" y1="16" x2="150" y2="16" stroke="var(--accent)" strokeWidth="2" strokeDasharray="8 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.5s" repeatCount="indefinite" />
        </line>
        <polygon points="150,10 166,16 150,22" fill="var(--accent)" />
        <line x1="166" y1="32" x2="16" y2="32" stroke="var(--accent-calm)" strokeWidth="2" strokeDasharray="8 4">
          <animate attributeName="stroke-dashoffset" from="0" to="24" dur="1.5s" repeatCount="indefinite" />
        </line>
        <polygon points="16,26 0,32 16,38" fill="var(--accent-calm)" />
      </svg>
      <div className="text-center leading-tight">
        <p className="text-[10px] sm:text-xs text-fg-secondary font-mono break-all max-w-40">
          wss://generativelanguage .googleapis.com/ws/...
        </p>
        <p className="text-[9px] text-fg-secondary/60 mt-0.5">
          {t('arch.wsDescription')}
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
  const { t } = useI18n();

  const FEATURES = [
    t('arch.feat1'),
    t('arch.feat2'),
    t('arch.feat3'),
    t('arch.feat4'),
    t('arch.feat5'),
    t('arch.feat6'),
    t('arch.feat7'),
    t('arch.feat8'),
    t('arch.feat9'),
    t('arch.feat10'),
    t('arch.feat11'),
    t('arch.feat12'),
    t('arch.feat13'),
    t('arch.feat14'),
    t('arch.feat15'),
    t('arch.feat16'),
  ];

  return (
    <main className="min-h-screen bg-bg text-fg relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full pointer-events-none" style={{ background: 'var(--accent-calm)', opacity: 0.04, filter: 'blur(120px)' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full pointer-events-none" style={{ background: '#7B8FD4', opacity: 0.04, filter: 'blur(150px)' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Navigation + toggles */}
        <div className="flex items-center justify-between mb-8">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm text-fg-secondary hover:text-fg transition-colors group"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="group-hover:underline">{t('arch.backHome')}</span>
          </a>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-2">
          {t('arch.title')}{' '}
          <span className="bg-linear-to-r from-accent to-accent-calm text-transparent bg-clip-text">
            Sanemos AI Live
          </span>
        </h1>
        <p className="text-fg-secondary text-sm sm:text-base mb-10 max-w-2xl">
          {t('arch.subtitle')}
        </p>

        {/* ============================================================ */}
        {/*  Row 1: Client  <--->  Gemini API                            */}
        {/* ============================================================ */}
        <div className="flex flex-col lg:flex-row items-stretch gap-0 mb-4">
          {/* CLIENT */}
          <SectionCard
            title={t('arch.clientTitle')}
            color="var(--accent)"
            glow
            className="flex-1 min-w-0"
          >
            <ul className="space-y-3 text-sm text-fg-secondary">
              <Tooltip text={t('arch.clientNextTooltip')}>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-accent" />
                  <span><strong className="text-fg">Next.js 16</strong> &mdash; {t('arch.clientNext')}</span>
                </li>
              </Tooltip>
              <Tooltip text={t('arch.clientAudioCapTooltip')}>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-accent" />
                  <span><strong className="text-fg">{t('arch.clientAudioCap')}</strong> &mdash; 16 kHz PCM via Web Audio API</span>
                </li>
              </Tooltip>
              <Tooltip text={t('arch.clientAudioPlayTooltip')}>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-accent" />
                  <span><strong className="text-fg">{t('arch.clientAudioPlay')}</strong> &mdash; 24 kHz, gapless scheduling</span>
                </li>
              </Tooltip>
              <Tooltip text={t('arch.clientCamTooltip')}>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-accent" />
                  <span><strong className="text-fg">{t('arch.clientCam')}</strong> &mdash; {t('arch.clientCamDesc')}</span>
                </li>
              </Tooltip>
              <Tooltip text={t('arch.clientPiiTooltip')}>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-accent" />
                  <span><strong className="text-fg">PII Scrubber</strong> &mdash; {t('arch.clientPiiDesc')}</span>
                </li>
              </Tooltip>
            </ul>
          </SectionCard>

          {/* ARROW */}
          <WebSocketArrow />

          {/* GEMINI API */}
          <SectionCard
            title="Gemini Multimodal Live API"
            color="var(--accent-calm)"
            glow
            className="flex-1 min-w-0"
          >
            <ul className="space-y-3 text-sm text-fg-secondary">
              <Tooltip text={t('arch.geminiModelTooltip')}>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-accent-calm" />
                  <span><strong className="text-fg">{t('arch.geminiModel')}</strong> &mdash; gemini-2.5-flash-native-audio</span>
                </li>
              </Tooltip>
              <Tooltip text={t('arch.geminiVoiceTooltip')}>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-accent-calm" />
                  <span><strong className="text-fg">{t('arch.geminiVoice')}</strong> &mdash; {t('arch.geminiVoiceDesc')}</span>
                </li>
              </Tooltip>
              <Tooltip text={t('arch.geminiTransTooltip')}>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-accent-calm" />
                  <span><strong className="text-fg">{t('arch.geminiTrans')}</strong> &mdash; {t('arch.geminiTransDesc')}</span>
                </li>
              </Tooltip>
              <Tooltip text={t('arch.geminiFuncTooltip')}>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-accent-calm" />
                  <span><strong className="text-fg">Function Calling</strong> &mdash; {t('arch.geminiFuncDesc')}</span>
                </li>
              </Tooltip>
              <Tooltip text={t('arch.geminiSysTooltip')}>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-accent-calm" />
                  <span><strong className="text-fg">System Instructions</strong> &mdash; {t('arch.geminiSysDesc')}</span>
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
        <SectionCard title={t('arch.agentsTitle')} color="#C47D8A" className="mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {AGENTS.map((a) => (
              <Tooltip key={a.id} text={t(a.roleKey)}>
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
                  <div className="text-[10px] text-fg-secondary mt-0.5 leading-tight">
                    {t(a.roleKey)}
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
          <SectionCard title={t('arch.toolsTitle')} color="#F59E0B" className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TOOL_GROUPS.map((g) => (
                <div key={g.titleKey}>
                  <h4
                    className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: g.color }}
                  >
                    {t(g.titleKey)}
                  </h4>
                  <ul className="space-y-1">
                    {g.tools.map((tool) => (
                      <li key={tool} className="text-xs text-fg-secondary font-mono flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: g.color }}
                        />
                        {tool}
                      </li>
                    ))}
                  </ul>
                  {g.notesKey && (
                    <p className="text-[10px] text-fg-secondary/60 italic mt-2 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
                      {t(g.notesKey)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Key Features — 1/3 width */}
          <SectionCard title={t('arch.featuresTitle')} color="#A78BFA">
            <ul className="space-y-2">
              {FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-fg-secondary">
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
        <div className="mt-10 rounded-2xl border p-5 sm:p-6" style={{ borderColor: 'var(--border)', background: 'var(--fg-alpha-3)' }}>
          <h3 className="text-sm font-bold uppercase tracking-wider text-fg-secondary mb-4">
            {t('arch.dataFlowTitle')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-fg-secondary">
            <div className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]" style={{ background: 'var(--accent-alpha-20)', color: 'var(--accent)' }}>1</span>
              <span>{t('arch.flow1')}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]" style={{ background: 'var(--accent-calm-alpha-10)', color: 'var(--accent-calm)' }}>2</span>
              <span>{t('arch.flow2')}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B] font-bold text-[10px]">3</span>
              <span>{t('arch.flow3')}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-[#E85D75]/20 flex items-center justify-center text-[#E85D75] font-bold text-[10px]">4</span>
              <span>{t('arch.flow4')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pb-8 text-center text-xs text-fg-secondary/50">
          Sanemos AI Live &mdash; Gemini Live Agent Challenge &mdash; Devpost 2025
        </footer>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Export with providers                                               */
/* ------------------------------------------------------------------ */

export default function ArchitecturePage() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <ArchitectureContent />
      </I18nProvider>
    </ThemeProvider>
  );
}
