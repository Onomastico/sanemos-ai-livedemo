# TODO
- [x] Fix WebSocket connection error in useGeminiLive.js
- [x] Determine correct Gemini Live API model and endpoint
- [x] Fix React strict mode double-mount reconnect loop
- [x] Fix audio cutoff — gapless scheduled playback at 24kHz
- [x] Add speaking indicators (user VAD + AI speaking state)
- [x] Fix Faro crisis agent — disconnect/reconnect with new system prompt
- [x] Fix transcription config — move to setup root level, camelCase
- [x] Redesign transcript UI — live subtitles + collapsible history
- [x] Fix Faro stuck after escalation — send context message to prime agent
- [x] Fix media stream leak on agent switch
- [x] Set up Bento UI styles for the agent cards
- [x] Barge-in (interrupción): activeSourcesRef es array de nodos, stopAllPlayback(), detección client-side (RMS>0.015 × 3 frames), handler serverContent.interrupted, mensajes parciales con …
- [x] Deploy to Vercel/Cloud Run (update NEXT_PUBLIC_GEMINI_API_KEY)
- [x] Generate Visual tool para Marco y Serena (diagramas, ilustraciones, guías mindfulness)

## Backlog
- [ ] Migración a Vertex AI para privacidad de datos (dificultad 5/10). SDK ya soporta Vertex nativamente. Requiere: 1 API route para token vending (`/api/token`), 1 token manager client-side, cambiar instanciación SDK en 4 archivos, IAM role en Cloud Run. Riesgo: Bearer token en WebSocket upgrade. Plan detallado en `.claude/plans/generic-soaring-sunset.md`
