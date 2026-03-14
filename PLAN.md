# Plan: Hackathon Compliance & Points Maximization

## Contexto
El hackathon requiere: Gemini model + (Google GenAI SDK OR ADK) + al menos 1 servicio Google Cloud.
Actualmente usamos WebSocket raw — hay riesgo de descalificación por no usar el SDK oficial.

---

## Fase 1: Migrar a @google/genai SDK (CRÍTICO — elimina riesgo de descalificación)

### 1.1 Instalar el SDK
- `npm install @google/genai`

### 1.2 Migrar SessionSummary.js (REST API call — más sencillo, empezar aquí)
- **Archivo:** `src/components/SessionSummary.js` (línea 29-47)
- **Cambio:** Reemplazar `fetch()` directo a `generativelanguage.googleapis.com` por:
  ```js
  import { GoogleGenAI } from '@google/genai';
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ parts: [{ text: prompt + transcript }] }],
    config: { temperature: 0.7, maxOutputTokens: 4096 }
  });
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  ```
- **Impacto:** Bajo riesgo, es una llamada REST simple

### 1.3 Migrar useGeminiLive.js (Live API WebSocket — más complejo)
- **Archivo:** `src/hooks/useGeminiLive.js`
- **Cambio:** Reemplazar WebSocket raw por `ai.live.connect()`
- **Mapeo de API:**
  | Actual (raw WS) | SDK (@google/genai) |
  |---|---|
  | `new WebSocket(url)` | `ai.live.connect({ model, config, callbacks })` |
  | `ws.send(JSON.stringify({ setup: ... }))` | Configuración va en `connect()` params |
  | `ws.send(JSON.stringify({ realtimeInput: { mediaChunks } }))` | `session.sendRealtimeInput({ media: { ... } })` |
  | `ws.send(JSON.stringify({ clientContent: ... }))` | `session.sendClientContent({ ... })` |
  | `ws.send(JSON.stringify({ toolResponse: ... }))` | `session.sendToolResponse({ functionResponses: [...] })` |
  | `ws.onmessage = (event) => { JSON.parse(event.data) }` | `callbacks.onmessage = (msg) => { /* ya parseado */ }` |
  | `ws.onclose` | `callbacks.onclose` |
  | `ws.close()` | `session.close()` |

- **Puntos críticos a preservar:**
  - Nullificar handlers antes de close (evita 1011 en switch_agent)
  - No enviar toolResponse para end_session/escalate
  - Audio gapless playback (24kHz scheduled)
  - Auto-reconnect en código 1008/1011
  - Transcripción bidireccional
  - Video frames como mediaChunks

- **Estrategia:** Crear wrapper que mantenga la misma interfaz interna pero use el SDK por debajo. Así el resto del código no cambia.

### 1.4 Verificación
- Probar: conectar, hablar, recibir audio, tool calls, switch agent, end session, video
- `npm run build` debe compilar sin errores

---

## Fase 2: Reescribir README.md (OBLIGATORIO para judges)

- Instrucciones claras de spin-up:
  1. Prerequisites (Node.js 20+, Google Cloud API key)
  2. Clone + install
  3. Configurar `.env.local`
  4. `npm run dev`
  5. Abrir `http://localhost:3000`
- Sección de deployment a Cloud Run
- Descripción del proyecto y features
- Link al architecture diagram
- Screenshots/GIFs si hay tiempo

---

## Fase 3: Mejorar Social Post Generation (más puntos en demo)

### 3.1 Web Share API
- **Archivo:** `src/components/SocialPostModal.js`
- Agregar botón "Compartir" que use `navigator.share()` (disponible en móvil)
- Fallback a copy si Web Share no está disponible

### 3.2 Preview visual mejorado
- Mostrar mockup visual del post según plataforma (card con avatar, texto, hashtags)
- Esto se ve mejor en el demo video

---

## Fase 4: Bonus Points

### 4.1 Blog post / contenido
- Publicar un post sobre cómo se construyó con Gemini + Google Cloud
- Incluir: "Created for the purposes of entering the Gemini Live Agent Challenge hackathon"
- Hashtag: #GeminiLiveAgentChallenge

### 4.2 GDG signup
- Registrarse en Google Developer Group y obtener link al perfil público

### 4.3 Automated Cloud Deployment (YA TENEMOS)
- `cloudbuild.yaml` + `Dockerfile` ya están en el repo ✅
- Asegurar que el README documente cómo usarlos

---

## Orden de Ejecución

1. **Fase 1.1** — Instalar SDK (1 min)
2. **Fase 1.2** — Migrar SessionSummary REST call (15 min)
3. **Fase 1.3** — Migrar useGeminiLive WebSocket a SDK (60-90 min, es el grueso)
4. **Fase 1.4** — Testing integral
5. **Fase 2** — README (20 min)
6. **Fase 3** — Social post improvements (30 min)
7. **Fase 4** — Bonus (fuera de código)

---

## Lo que NO necesitamos hacer

- **UI Navigator**: Es otra categoría del hackathon, no aplica a nosotros
- **ADK**: El SDK es suficiente, no necesitamos ADK
- **Interleaved output**: Es para la categoría "Creative Storyteller", no para Live Agents
