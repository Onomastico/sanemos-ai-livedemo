"use client";

import { useState, useEffect } from 'react';
import { getAllAgents, getAgent } from '@/lib/agents';
import { USER_CONTEXTS, detectCountry } from '@/lib/userContexts';
import { loadDiary } from '@/lib/diary';
import { getAppointments } from '@/lib/therapist';
import Image from 'next/image';
import GeminiLiveSession from '@/components/GeminiLiveSession';
import DiaryModal from '@/components/DiaryModal';
import AppointmentsViewModal from '@/components/AppointmentsViewModal';
import { I18nProvider, useI18n } from '@/i18n/I18nContext';
import LanguageToggle from '@/components/LanguageToggle';
import SettingsPanel, { loadSettings } from '@/components/SettingsPanel';

function HomeContent() {
  const { t } = useI18n();
  const agents = getAllAgents();
  const [apiKey, setApiKey] = useState(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedContext, setSelectedContext] = useState(USER_CONTEXTS[0]);
  const [detectedCountry, setDetectedCountry] = useState(null);
  const [accessCode, setAccessCode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [accessError, setAccessError] = useState(false);
  const [geminiSettings, setGeminiSettings] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDiary, setShowDiary] = useState(false);
  const [showAppointments, setShowAppointments] = useState(false);
  const [showVoiceCommands, setShowVoiceCommands] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [diaryEntries, setDiaryEntries] = useState([]);

  const requiredCode = process.env.NEXT_PUBLIC_ACCESS_CODE;

  useEffect(() => {
    detectCountry().then(setDetectedCountry);
    setGeminiSettings(loadSettings());
    if (!requiredCode || sessionStorage.getItem('sanemos_authorized') === 'true') {
      setIsAuthorized(true);
    }
    try {
      const onboardingDone = localStorage.getItem('sanemos_onboarding_done') === 'true';
      setIsFirstVisit(!onboardingDone);
      setDiaryEntries(loadDiary());
    } catch {}
  }, []);

  const handleAccessSubmit = (e) => {
    e.preventDefault();
    if (accessCode.trim() === requiredCode) {
      setIsAuthorized(true);
      setAccessError(false);
      sessionStorage.setItem('sanemos_authorized', 'true');
    } else {
      setAccessError(true);
    }
  };

  if (selectedAgent) {
    return (
      <GeminiLiveSession
        agent={selectedAgent}
        apiKey={apiKey}
        userContext={selectedContext}
        userCountry={detectedCountry}
        geminiSettings={geminiSettings}
        onClose={() => setSelectedAgent(null)}
        isFirstVisit={isFirstVisit}
      />
    );
  }

  // Access code gate
  if (!isAuthorized) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#7B8FD4]/10 blur-[150px] rounded-full pointer-events-none" />
        <LanguageToggle className="absolute top-6 right-6 z-20" />
        <div className="z-10 text-center max-w-md">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-[#9CCF6A] to-[#5FB7A6] text-transparent bg-clip-text">
            Sanemos AI <span className="text-white">Live</span>
          </h1>
          <p className="text-gray-400 mb-8 text-sm">
            {t('page.accessCodeRequired')}
          </p>
          <form onSubmit={handleAccessSubmit} className="flex flex-col items-center gap-4">
            <input
              type="password"
              placeholder={t('page.accessCodePlaceholder')}
              className={`w-full bg-black/40 border rounded-full px-6 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9CCF6A] transition-all ${
                accessError ? 'border-red-500/60' : 'border-white/10'
              }`}
              value={accessCode}
              onChange={(e) => { setAccessCode(e.target.value); setAccessError(false); }}
              autoFocus
            />
            {accessError && (
              <p className="text-red-400 text-xs">{t('page.accessCodeError')}</p>
            )}
            <button
              type="submit"
              className="px-8 py-3 rounded-full bg-gradient-to-r from-[#9CCF6A] to-[#5FB7A6] text-black font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              {t('page.enter')}
            </button>
          </form>
          <p className="text-gray-600 text-xs mt-6">
            {t('page.footer')}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[url('/bg-texture.svg')] bg-cover bg-center flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">

      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#7B8FD4]/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        <button
          onClick={() => setShowVoiceCommands(true)}
          className="p-2 rounded-full backdrop-blur-md border bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 transition-colors"
          title={t('page.voiceCommands')}
        >
          🎙️
        </button>
        <button
          onClick={() => { setShowDiary(true); setDiaryEntries(loadDiary()); }}
          className="p-2 rounded-full backdrop-blur-md border bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 transition-colors"
          title={t('page.diary')}
        >
          📔
        </button>
        <button
          onClick={() => setShowAppointments(true)}
          className="p-2 rounded-full backdrop-blur-md border bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 transition-colors"
          title={t('page.appointments')}
        >
          📅
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-full backdrop-blur-md border transition-colors ${
            showSettings ? 'bg-white/15 border-white/20 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
          }`}
          title={t('settings.title')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
        <LanguageToggle />
      </div>

      <header className="text-center mb-16 z-10 w-full">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-[#9CCF6A] to-[#5FB7A6] text-transparent bg-clip-text">
          Sanemos AI <span className="text-white">Live</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto font-medium mb-8">
          {t('page.tagline')}
        </p>

        {!process.env.NEXT_PUBLIC_GEMINI_API_KEY && (
          <div className="max-w-md mx-auto relative group">
            <input
              type="password"
              placeholder={t('page.apiKeyPlaceholder')}
              className="w-full bg-black/40 border border-white/10 rounded-full px-6 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9CCF6A] transition-all"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-3 flex items-center justify-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {t('page.apiKeyNote')}
            </p>
          </div>
        )}
      </header>

      {/* Settings Panel */}
      {showSettings && geminiSettings && (
        <div className="w-full max-w-6xl z-10 mb-8">
          <SettingsPanel settings={geminiSettings} onChange={setGeminiSettings} />
        </div>
      )}

      {/* Start Button */}
      <div className="z-10 mb-12">
        <button
          onClick={() => {
            if (!apiKey) {
              alert(t('page.apiKeyAlert'));
              return;
            }
            const sofiaAgent = getAgent('sofia');
            if (sofiaAgent) {
              setSelectedAgent(sofiaAgent);
            }
          }}
          className="px-8 py-4 rounded-full bg-gradient-to-r from-[#9CCF6A] to-[#5FB7A6] text-black font-bold text-lg hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
        >
          👋 {t('page.startSession') || 'Comenzar'}
        </button>
      </div>

      {/* Context Selection */}
      <section className="w-full max-w-6xl z-10 mb-10">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 text-center">
          {t('page.selectProfile')}
          {detectedCountry && <span className="text-gray-600 normal-case tracking-normal font-normal"> — {t('page.detectedCountry', { country: detectedCountry })}</span>}
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {USER_CONTEXTS.map((ctx) => (
            <button
              key={ctx.id}
              onClick={() => setSelectedContext(ctx)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all duration-200 text-left ${
                selectedContext.id === ctx.id
                  ? 'bg-white/10 border-[#9CCF6A] shadow-[0_0_12px_rgba(156,207,106,0.2)]'
                  : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
              }`}
            >
              <span className="text-xl">{ctx.emoji}</span>
              <div className="flex flex-col">
                <span className={`text-sm font-medium ${selectedContext.id === ctx.id ? 'text-white' : 'text-gray-300'}`}>
                  {t(`contexts.${ctx.id}.name`)}
                </span>
                <span className="text-xs text-gray-500">{t(`contexts.${ctx.id}.summary`)}</span>
              </div>
            </button>
          ))}
        </div>
        {selectedContext.detail && (
          <p className="text-xs text-gray-500 text-center mt-3 max-w-2xl mx-auto italic">
            &quot;{t(`contexts.${selectedContext.id}.detail`)}&quot;
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl z-10">
        {agents.filter(a => !a.isReceptionist).map((agent) => (
          <button
            key={agent.id}
            onClick={() => {
              if (!apiKey) {
                alert(t('page.apiKeyAlert'));
                return;
              }
              setSelectedAgent(agent);
            }}
            className="flex flex-col text-left overflow-hidden bg-[#1E2525] border border-white/10 rounded-3xl cursor-pointer transition-all duration-300 hover:-translate-y-1 group relative"
            style={{
              '--agent-color': agent.color,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = agent.color;
              e.currentTarget.style.boxShadow = `0 8px 32px ${agent.color}40`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
            }}
          >
            {/* Hero Area */}
            <div
              className="relative h-[140px] flex items-center justify-center shrink-0 w-full"
              style={{
                background: `linear-gradient(160deg, ${agent.color}30, ${agent.color}10)`
              }}
            >
              <div
                className="w-[88px] h-[88px] rounded-full overflow-hidden relative border-[3px] shadow-[0_0_20px_var(--agent-color)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_32px_var(--agent-color)] bg-[#121B1A]"
                style={{ borderColor: agent.color }}
              >
                <Image
                  src={agent.avatar}
                  alt={agent.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <span className="absolute top-3 right-4 text-xl opacity-70 pointer-events-none">{agent.emoji}</span>
            </div>

            {/* Identity */}
            <div className="pt-4 px-6 pb-2 flex flex-col gap-1">
              <h3 className="font-bold text-xl text-white m-0">{agent.name}</h3>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: agent.color }}>
                {t(`agents.${agent.id}.focus`)}
              </span>
            </div>

            {/* Quote */}
            {agent.quote && (
              <p
                className="mx-6 mb-2 text-sm italic text-gray-400 leading-relaxed py-2 px-3 rounded-r bg-white/5 border-l-2"
                style={{ borderLeftColor: agent.color }}
              >
                {t(`agents.${agent.id}.quote`)}
              </p>
            )}

            {/* Description */}
            <p className="mx-6 mb-4 text-sm text-gray-400 leading-[1.65] grow">
              {t(`agents.${agent.id}.description`)}
            </p>

            {/* Traits */}
            {agent.traits && (
              <div className="flex flex-wrap gap-2 px-6 mb-4">
                {t(`agents.${agent.id}.traits`).split(',').map(trait => (
                  <span
                    key={trait}
                    className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium border"
                    style={{
                      backgroundColor: `${agent.color}20`,
                      color: agent.color,
                      borderColor: `${agent.color}40`
                    }}
                  >
                    {trait}
                  </span>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between p-3 px-6 border-t border-white/10 mt-auto">
              {agent.userCount !== undefined ? (
                <span className="text-xs font-medium text-gray-500">
                  {agent.userCount} {t('page.accompanied')}
                </span>
              ) : (
                <span />
              )}
              <span className="text-sm font-semibold transition-all group-hover:tracking-wide" style={{ color: agent.color }}>
                {t('page.talk')} →
              </span>
            </div>

            {/* Glow effect at bottom right */}
            <div
              className="absolute -bottom-[60px] -right-[60px] w-[160px] h-[160px] rounded-full opacity-5 transition-opacity duration-300 pointer-events-none group-hover:opacity-10"
              style={{ backgroundColor: agent.color }}
            />
          </button>
        ))}
      </div>

      <footer className="mt-16 text-sm text-gray-500 z-10 font-medium flex items-center gap-4">
        <span>{t('page.footer')}</span>
        <a href="/architecture" className="text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors">
          {t('page.viewArchitecture')}
        </a>
      </footer>

      {/* Diary Modal */}
      <DiaryModal
        isOpen={showDiary}
        onClose={() => setShowDiary(false)}
        locale={t('__lang__')}
      />

      {/* Appointments Modal */}
      <AppointmentsViewModal
        isOpen={showAppointments}
        onClose={() => setShowAppointments(false)}
        locale={t('__lang__')}
      />

      {/* Voice Commands Modal */}
      {showVoiceCommands && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowVoiceCommands(false)}>
          <div className="bg-[#1a1f1f] border border-white/10 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <h2 className="text-lg font-bold text-white">{t('page.voiceCommandsTitle')}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{t('page.voiceCommandsSubtitle')}</p>
              </div>
              <button onClick={() => setShowVoiceCommands(false)} className="text-gray-500 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">✕</button>
            </div>
            <div className="p-5 flex flex-col gap-5">
              {/* General commands */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5FB7A6] mb-2">{t('page.cmdCatGeneral')}</h3>
                <ul className="flex flex-col gap-1.5">
                  {['cmdEndSession', 'cmdSwitchAgent', 'cmdSaveDiary', 'cmdSendTherapist', 'cmdSchedule', 'cmdBookSpecific', 'cmdShowDiary', 'cmdShowAppointments', 'cmdSocialPost', 'cmdCopyClipboard', 'cmdOpenUrl', 'cmdCloseModal'].map(k => (
                    <li key={k} className="text-sm text-gray-300 leading-relaxed bg-white/[0.03] rounded-lg px-3 py-2 border border-white/5">
                      {t(`page.${k}`)}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Sofia commands */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5FB7A6] mb-2">{t('page.cmdCatSofia')}</h3>
                <ul className="flex flex-col gap-1.5">
                  {['cmdSofiaRoute', 'cmdSofiaTour'].map(k => (
                    <li key={k} className="text-sm text-gray-300 leading-relaxed bg-white/[0.03] rounded-lg px-3 py-2 border border-white/5">
                      {t(`page.${k}`)}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Serena commands */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#D4A574] mb-2">{t('page.cmdCatSerena')}</h3>
                <ul className="flex flex-col gap-1.5">
                  {['cmdBreathing', 'cmdStopBreathing'].map(k => (
                    <li key={k} className="text-sm text-gray-300 leading-relaxed bg-white/[0.03] rounded-lg px-3 py-2 border border-white/5">
                      {t(`page.${k}`)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <I18nProvider>
      <HomeContent />
    </I18nProvider>
  );
}
