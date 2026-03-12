"use client";

import { useState, useEffect } from 'react';
import { getAllAgents } from '@/lib/agents';
import { USER_CONTEXTS, detectCountry } from '@/lib/userContexts';
import Image from 'next/image';
import GeminiLiveSession from '@/components/GeminiLiveSession';

export default function Home() {
  const agents = getAllAgents();
  const [apiKey, setApiKey] = useState(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedContext, setSelectedContext] = useState(USER_CONTEXTS[0]);
  const [detectedCountry, setDetectedCountry] = useState(null);

  useEffect(() => {
    detectCountry().then(setDetectedCountry);
  }, []);

  if (selectedAgent) {
    return (
      <GeminiLiveSession
        agent={selectedAgent}
        apiKey={apiKey}
        userContext={selectedContext}
        userCountry={detectedCountry}
        onClose={() => setSelectedAgent(null)}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[url('/bg-texture.svg')] bg-cover bg-center flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">

      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#7B8FD4]/10 blur-[150px] rounded-full pointer-events-none" />

      <header className="text-center mb-16 z-10 w-full">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-[#9CCF6A] to-[#5FB7A6] text-transparent bg-clip-text">
          Sanemos AI <span className="text-white">Live</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto font-medium mb-8">
          Habla directamente con nuestros agentes de apoyo emocional propulsados por la nueva Gemini Multimodal Live API. Experimenta latencia ultrabaja y detección de crisis en tiempo real.
        </p>

        {!process.env.NEXT_PUBLIC_GEMINI_API_KEY && (
          <div className="max-w-md mx-auto relative group">
            <input
              type="password"
              placeholder="Pega tu Google Gemini API Key aquí..."
              className="w-full bg-black/40 border border-white/10 rounded-full px-6 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9CCF6A] transition-all"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-3 flex items-center justify-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              La llave solo se usa en tu navegador (Client-side WebSocket).
            </p>
          </div>
        )}
      </header>

      {/* Context Selection */}
      <section className="w-full max-w-6xl z-10 mb-10">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 text-center">
          Selecciona un perfil de usuario para la demo
          {detectedCountry && <span className="text-gray-600 normal-case tracking-normal font-normal"> — País detectado: {detectedCountry}</span>}
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
                  {ctx.name}
                </span>
                <span className="text-xs text-gray-500">{ctx.summary}</span>
              </div>
            </button>
          ))}
        </div>
        {selectedContext.detail && (
          <p className="text-xs text-gray-500 text-center mt-3 max-w-2xl mx-auto italic">
            &quot;{selectedContext.detail}&quot;
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl z-10">
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => {
              if (!apiKey) {
                alert('Por favor ingresa tu API Key primero para probar la demo.');
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
                {agent.focus}
              </span>
            </div>

            {/* Quote */}
            {agent.quote && (
              <p
                className="mx-6 mb-2 text-sm italic text-gray-400 leading-relaxed py-2 px-3 rounded-r bg-white/5 border-l-2"
                style={{ borderLeftColor: agent.color }}
              >
                {agent.quote}
              </p>
            )}

            {/* Description */}
            <p className="mx-6 mb-4 text-sm text-gray-400 leading-[1.65] grow">
              {agent.description}
            </p>

            {/* Traits */}
            {agent.traits && (
              <div className="flex flex-wrap gap-2 px-6 mb-4">
                {agent.traits.map(trait => (
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
                  👥 {agent.userCount} acompañadas
                </span>
              ) : (
                <span />
              )}
              <span className="text-sm font-semibold transition-all group-hover:tracking-wide" style={{ color: agent.color }}>
                Hablar →
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

      <footer className="mt-16 text-sm text-gray-500 z-10 font-medium">
        Demo for Google Gemini Live Agent Challenge • sanemos.ai
      </footer>
    </main>
  );
}
