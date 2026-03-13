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
import { ThemeProvider } from '@/theme/ThemeContext';
import LanguageToggle from '@/components/LanguageToggle';
import ThemeToggle from '@/components/ThemeToggle';
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
      <main className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#7B8FD4]/10 blur-[150px] rounded-full pointer-events-none" />
        <LanguageToggle className="absolute top-6 right-6 z-20" />
        <div className="z-10 text-center max-w-md">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-accent to-accent-calm text-transparent bg-clip-text">
            Sanemos AI <span className="text-fg">Live</span>
          </h1>
          <p className="text-fg-secondary mb-8 text-sm">
            {t('page.accessCodeRequired')}
          </p>
          <form onSubmit={handleAccessSubmit} className="flex flex-col items-center gap-4">
            <input
              type="password"
              placeholder={t('page.accessCodePlaceholder')}
              className={`w-full bg-bg/40 border rounded-full px-6 py-4 text-fg placeholder-fg-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent transition-all ${
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
              className="px-8 py-3 rounded-full bg-gradient-to-r from-accent to-accent-calm text-bg font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              {t('page.enter')}
            </button>
          </form>
          <p className="text-fg-secondary/60 text-xs mt-6">
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
          className="p-2 rounded-full backdrop-blur-md border bg-fg/5 border-fg/8 text-fg-secondary hover:bg-fg/10 transition-colors"
          title={t('page.voiceCommands')}
        >
          🎙️
        </button>
        <button
          onClick={() => { setShowDiary(true); setDiaryEntries(loadDiary()); }}
          className="p-2 rounded-full backdrop-blur-md border bg-fg/5 border-fg/8 text-fg-secondary hover:bg-fg/10 transition-colors"
          title={t('page.diary')}
        >
          📔
        </button>
        <button
          onClick={() => setShowAppointments(true)}
          className="p-2 rounded-full backdrop-blur-md border bg-fg/5 border-fg/8 text-fg-secondary hover:bg-fg/10 transition-colors"
          title={t('page.appointments')}
        >
          📅
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-full backdrop-blur-md border transition-colors ${
            showSettings ? 'bg-fg/15 border-fg/20 text-fg' : 'bg-fg/5 border-fg/8 text-fg-secondary hover:bg-fg/10'
          }`}
          title={t('settings.title')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <header className="text-center mb-16 z-10 w-full">
        {!process.env.NEXT_PUBLIC_GEMINI_API_KEY && (
          <div className="max-w-md mx-auto relative group">
            <input
              type="password"
              placeholder={t('page.apiKeyPlaceholder')}
              className="w-full bg-bg/40 border border-fg/10 rounded-full px-6 py-4 text-fg placeholder-fg-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent transition-all"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-fg-secondary mt-3 flex items-center justify-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {t('page.apiKeyNote')}
            </p>
          </div>
        )}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-accent to-accent-calm text-transparent bg-clip-text">
          Sanemos AI <span className="text-fg">Live</span>
        </h1>
        <p className="text-lg sm:text-xl text-fg-secondary max-w-2xl mx-auto font-medium mb-8">
          {t('page.tagline')}
        </p>
      </header>

      {/* Settings Panel */}
      {showSettings && geminiSettings && (
        <div className="w-full max-w-6xl z-10 mb-8">
          <SettingsPanel settings={geminiSettings} onChange={setGeminiSettings} />
        </div>
      )}

      {/* Context Selection */}
      <section className="w-full max-w-6xl z-10 mb-10">
        <h2 className="text-sm font-semibold text-fg-secondary uppercase tracking-wider mb-4 text-center">
          {t('page.selectProfile')}
          {detectedCountry && <span className="text-fg-secondary/60 normal-case tracking-normal font-normal"> — {t('page.detectedCountry', { country: detectedCountry })}</span>}
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {USER_CONTEXTS.map((ctx) => (
            <button
              key={ctx.id}
              onClick={() => setSelectedContext(ctx)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all duration-200 text-left ${
                selectedContext.id === ctx.id
                  ? 'bg-fg/10 border-accent shadow-[0_0_12px_rgba(156,207,106,0.2)]'
                  : 'bg-fg/3 border-fg/10 hover:bg-fg/6 hover:border-fg/20'
              }`}
            >
              <span className="text-xl">{ctx.emoji}</span>
              <div className="flex flex-col">
                <span className={`text-sm font-medium ${selectedContext.id === ctx.id ? 'text-fg' : 'text-fg/70'}`}>
                  {t(`contexts.${ctx.id}.name`)}
                </span>
                <span className="text-xs text-fg-secondary">{t(`contexts.${ctx.id}.summary`)}</span>
              </div>
            </button>
          ))}
        </div>
        {selectedContext.detail && (
          <p className="text-xs text-fg-secondary text-center mt-3 max-w-2xl mx-auto italic">
            &quot;{t(`contexts.${selectedContext.id}.detail`)}&quot;
          </p>
        )}
      </section>

      {/* Start — Sofia receptionist CTA with speech bubbles */}
      <div className="z-10 mb-12 relative flex flex-col items-center">
        {/* Speech bubbles container — hidden on mobile */}
        <div className="hidden md:block absolute inset-0 pointer-events-none" aria-hidden="true">
          {/* Left bubbles */}
          <div className="absolute bg-surface border border-border rounded-xl px-3 py-2 text-xs text-fg-secondary shadow-sm"
            style={{ top: '-10px', left: '-180px', maxWidth: '160px' }}>
            {t('page.sofiaBubble1')}
            <span className="absolute" style={{ right: '-8px', top: '10px', width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '8px solid var(--fg-secondary)' }} />
          </div>
          <div className="absolute bg-surface border border-border rounded-xl px-3 py-2 text-xs text-fg-secondary shadow-sm"
            style={{ top: '55px', left: '-200px', maxWidth: '170px' }}>
            {t('page.sofiaBubble2')}
            <span className="absolute" style={{ right: '-8px', top: '10px', width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '8px solid var(--fg-secondary)' }} />
          </div>
          <div className="absolute bg-surface border border-border rounded-xl px-3 py-2 text-xs text-fg-secondary shadow-sm"
            style={{ top: '120px', left: '-170px', maxWidth: '150px' }}>
            {t('page.sofiaBubble3')}
            <span className="absolute" style={{ right: '-8px', top: '10px', width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '8px solid var(--fg-secondary)' }} />
          </div>

          {/* Right bubbles */}
          <div className="absolute bg-surface border border-border rounded-xl px-3 py-2 text-xs text-fg-secondary shadow-sm"
            style={{ top: '-10px', right: '-160px', maxWidth: '140px' }}>
            {t('page.sofiaBubble4')}
            <span className="absolute" style={{ left: '-8px', top: '10px', width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderRight: '8px solid var(--fg-secondary)' }} />
          </div>
          <div className="absolute bg-surface border border-border rounded-xl px-3 py-2 text-xs text-fg-secondary shadow-sm"
            style={{ top: '55px', right: '-210px', maxWidth: '190px' }}>
            {t('page.sofiaBubble5')}
            <span className="absolute" style={{ left: '-8px', top: '10px', width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderRight: '8px solid var(--fg-secondary)' }} />
          </div>
          <div className="absolute bg-surface border border-border rounded-xl px-3 py-2 text-xs text-fg-secondary shadow-sm"
            style={{ top: '120px', right: '-200px', maxWidth: '180px' }}>
            {t('page.sofiaBubble6')}
            <span className="absolute" style={{ left: '-8px', top: '10px', width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderRight: '8px solid var(--fg-secondary)' }} />
          </div>
        </div>

        {/* Sofia avatar button */}
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
          className="group relative w-32 h-32 rounded-full overflow-hidden border-[3px] border-accent-calm shadow-[0_0_30px_rgba(95,183,166,0.25)] hover:shadow-[0_0_50px_rgba(95,183,166,0.4)] hover:scale-105 transition-all duration-300 cursor-pointer"
        >
          <Image
            src="/sofia.png"
            alt="Sofía"
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-linear-to-t from-bg/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        <span className="text-lg font-bold text-fg mt-3">{t('page.enterReception')}</span>
        <span className="text-xs text-fg-secondary">{t('page.enterReceptionHint')}</span>
      </div>

      {/* Agent grid wrapped as Sofia's section */}
      <div className="w-full max-w-6xl z-10 rounded-[2rem] border border-accent-calm/15 bg-accent-calm/3 p-6 pt-2 relative overflow-hidden">
        {/* Section label */}
        <p className="text-center text-xs text-accent-calm font-semibold uppercase tracking-widest mb-5">
          {t('page.sofiaAgents')}
        </p>

        {/* Companion agents (excludes Sofia & Faro) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.filter(a => !a.isReceptionist && a.id !== 'faro').map((agent) => (
            <button
              key={agent.id}
              onClick={() => {
                if (!apiKey) { alert(t('page.apiKeyAlert')); return; }
                setSelectedAgent(agent);
              }}
              className="flex flex-col text-left overflow-hidden bg-surface/80 backdrop-blur-sm border border-fg/8 rounded-3xl cursor-pointer transition-all duration-300 hover:-translate-y-1 group relative"
              style={{ '--agent-color': agent.color, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = agent.color; e.currentTarget.style.boxShadow = `0 8px 32px ${agent.color}40`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)'; }}
            >
              <div className="relative h-[140px] flex items-center justify-center shrink-0 w-full" style={{ background: `linear-gradient(160deg, ${agent.color}30, ${agent.color}10)` }}>
                <div className="w-[88px] h-[88px] rounded-full overflow-hidden relative border-[3px] shadow-[0_0_20px_var(--agent-color)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_32px_var(--agent-color)] bg-bg" style={{ borderColor: agent.color }}>
                  <Image src={agent.avatar} alt={agent.name} fill className="object-cover" unoptimized />
                </div>
                <span className="absolute top-3 right-4 text-xl opacity-70 pointer-events-none">{agent.emoji}</span>
              </div>
              <div className="pt-4 px-6 pb-2 flex flex-col gap-1">
                <h3 className="font-bold text-xl text-fg m-0">{agent.name}</h3>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: agent.color }}>{t(`agents.${agent.id}.focus`)}</span>
              </div>
              {agent.quote && (
                <p className="font-ai mx-6 mb-2 text-sm text-fg-secondary leading-relaxed py-2 px-3 rounded-r bg-fg/3 border-l-2" style={{ borderLeftColor: agent.color }}>{t(`agents.${agent.id}.quote`)}</p>
              )}
              <p className="mx-6 mb-4 text-sm text-fg-secondary leading-[1.65] grow">{t(`agents.${agent.id}.description`)}</p>
              {agent.traits && (
                <div className="flex flex-wrap gap-2 px-6 mb-4">
                  {t(`agents.${agent.id}.traits`).split(',').map(trait => (
                    <span key={trait} className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium border" style={{ backgroundColor: `${agent.color}20`, color: agent.color, borderColor: `${agent.color}40` }}>{trait}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between p-3 px-6 border-t border-fg/6 mt-auto">
                {agent.userCount !== undefined ? (
                  <span className="text-xs font-medium text-fg-secondary">{agent.userCount} {t('page.accompanied')}</span>
                ) : (<span />)}
                <span className="text-sm font-semibold transition-all group-hover:tracking-wide" style={{ color: agent.color }}>{t('page.talk')} →</span>
              </div>
              <div className="absolute -bottom-[60px] -right-[60px] w-[160px] h-[160px] rounded-full opacity-5 transition-opacity duration-300 pointer-events-none group-hover:opacity-10" style={{ backgroundColor: agent.color }} />
            </button>
          ))}
        </div>

        {/* Faro — Crisis agent, centered on its own row */}
        {(() => {
          const faro = agents.find(a => a.id === 'faro');
          if (!faro) return null;
          return (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => {
                  if (!apiKey) { alert(t('page.apiKeyAlert')); return; }
                  setSelectedAgent(faro);
                }}
                className="flex flex-col text-left overflow-hidden rounded-3xl cursor-pointer transition-all duration-300 hover:-translate-y-1 group relative w-full max-w-sm border-2 border-[#E85D75]/30 bg-[#E85D75]/5 backdrop-blur-sm hover:border-[#E85D75]/60"
                style={{ '--agent-color': '#E85D75', boxShadow: '0 8px 32px rgba(232,93,117,0.15)' }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 40px rgba(232,93,117,0.35)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(232,93,117,0.15)'; }}
              >
                <div className="relative h-[140px] flex items-center justify-center shrink-0 w-full" style={{ background: 'linear-gradient(160deg, rgba(232,93,117,0.25), rgba(232,93,117,0.08))' }}>
                  <div className="w-[88px] h-[88px] rounded-full overflow-hidden relative border-[3px] border-[#E85D75] shadow-[0_0_24px_rgba(232,93,117,0.4)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_40px_rgba(232,93,117,0.5)] bg-bg">
                    <Image src={faro.avatar} alt={faro.name} fill className="object-cover" unoptimized />
                  </div>
                  <span className="absolute top-3 right-4 text-xl opacity-70 pointer-events-none">{faro.emoji}</span>
                </div>
                <div className="pt-4 px-6 pb-2 flex flex-col gap-1">
                  <h3 className="font-bold text-xl text-fg m-0">{faro.name}</h3>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#E85D75]">{t('agents.faro.focus')}</span>
                </div>
                {faro.quote && (
                  <p className="font-ai mx-6 mb-2 text-sm text-fg-secondary leading-relaxed py-2 px-3 rounded-r bg-[#E85D75]/8 border-l-2 border-l-[#E85D75]">{t('agents.faro.quote')}</p>
                )}
                <p className="mx-6 mb-4 text-sm text-fg-secondary leading-[1.65] grow">{t('agents.faro.description')}</p>
                {faro.traits && (
                  <div className="flex flex-wrap gap-2 px-6 mb-4">
                    {t('agents.faro.traits').split(',').map(trait => (
                      <span key={trait} className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium border border-[#E85D75]/40 bg-[#E85D75]/15 text-[#E85D75]">{trait}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between p-3 px-6 border-t border-[#E85D75]/15 mt-auto">
                  {faro.userCount !== undefined ? (
                    <span className="text-xs font-medium text-fg-secondary">{faro.userCount} {t('page.accompanied')}</span>
                  ) : (<span />)}
                  <span className="text-sm font-semibold text-[#E85D75] transition-all group-hover:tracking-wide">{t('page.talk')} →</span>
                </div>
                <div className="absolute -bottom-[60px] -right-[60px] w-[160px] h-[160px] rounded-full bg-[#E85D75] opacity-5 transition-opacity duration-300 pointer-events-none group-hover:opacity-15" />
              </button>
            </div>
          );
        })()}
      </div>

      <footer className="mt-16 text-sm text-fg-secondary/60 z-10 font-medium flex items-center gap-4">
        <span>{t('page.footer')}</span>
        <a href="/architecture" className="text-fg-secondary/60 hover:text-fg underline underline-offset-2 transition-colors">
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
        <div className="fixed inset-0 bg-(--overlay) backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowVoiceCommands(false)}>
          <div className="bg-(--surface-alpha) border border-fg/8 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-fg/6">
              <div>
                <h2 className="text-lg font-bold text-fg">{t('page.voiceCommandsTitle')}</h2>
                <p className="text-xs text-fg-secondary mt-0.5">{t('page.voiceCommandsSubtitle')}</p>
              </div>
              <button onClick={() => setShowVoiceCommands(false)} className="text-fg-secondary hover:text-fg text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-fg/8">✕</button>
            </div>
            <div className="p-5 flex flex-col gap-5">
              {/* General commands */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-accent-calm mb-2">{t('page.cmdCatGeneral')}</h3>
                <ul className="flex flex-col gap-1.5">
                  {['cmdEndSession', 'cmdSwitchAgent', 'cmdSaveDiary', 'cmdSendTherapist', 'cmdSchedule', 'cmdBookSpecific', 'cmdShowDiary', 'cmdShowAppointments', 'cmdSocialPost', 'cmdCopyClipboard', 'cmdOpenUrl', 'cmdCloseModal'].map(k => (
                    <li key={k} className="text-sm text-fg/80 leading-relaxed bg-fg/3 rounded-lg px-3 py-2 border border-fg/5">
                      {t(`page.${k}`)}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Sofia commands */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-accent-calm mb-2">{t('page.cmdCatSofia')}</h3>
                <ul className="flex flex-col gap-1.5">
                  {['cmdSofiaRoute', 'cmdSofiaTour'].map(k => (
                    <li key={k} className="text-sm text-fg/80 leading-relaxed bg-fg/3 rounded-lg px-3 py-2 border border-fg/5">
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
                    <li key={k} className="text-sm text-fg/80 leading-relaxed bg-fg/3 rounded-lg px-3 py-2 border border-fg/5">
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
    <ThemeProvider>
    <I18nProvider>
      <HomeContent />
    </I18nProvider>
    </ThemeProvider>
  );
}
