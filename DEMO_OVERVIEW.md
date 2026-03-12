# Sanemos AI Live — Demo Overview

## Qué es Sanemos AI Live

Sanemos AI Live es una plataforma de acompañamiento emocional en duelo que utiliza la **Gemini Multimodal Live API** para crear conversaciones de voz en tiempo real con agentes de IA especializados. Todo el procesamiento ocurre client-side a través de WebSocket directo con Gemini, logrando latencia ultrabaja sin servidor intermedio.

**Stack:** Next.js 16 · React 19 · Tailwind CSS v4 · Gemini Multimodal Live API (WebSocket) · Gemini REST API (resumen)

---

## Arquitectura Técnica

### Conexión con Gemini

- **Protocolo:** WebSocket directo a `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent`
- **Modelo:** `models/gemini-2.5-flash-native-audio-preview-12-2025`
- **Audio de entrada:** Captura de micrófono a 16kHz (ScriptProcessor), convertido a PCM Int16 → Base64, enviado como `realtimeInput.mediaChunks`
- **Audio de salida:** PCM a 24kHz recibido del servidor, playback gapless con AudioContext de 24kHz usando `source.start(scheduledTime)`
- **Transcripción:** Bidireccional (`inputAudioTranscription` + `outputAudioTranscription`) con acumulación de fragmentos y debounce de 600ms en `turnComplete`
- **Video:** Frames JPEG 320x240 a 0.6 quality, 1 FPS, enviados como `realtimeInput.mediaChunks` con `mimeType: "image/jpeg"`

### Setup Message

```json
{
  "setup": {
    "model": "models/gemini-2.5-flash-native-audio-preview-12-2025",
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "speechConfig": {
        "voiceConfig": {
          "prebuiltVoiceConfig": { "voiceName": "Aoede" }
        }
      }
    },
    "systemInstruction": { "parts": [{ "text": "..." }] },
    "tools": [{ "functionDeclarations": [...] }],
    "inputAudioTranscription": {},
    "outputAudioTranscription": {}
  }
}
```

> **Nota importante:** `speechConfig` va DENTRO de `generationConfig`, y `inputAudioTranscription`/`outputAudioTranscription` van en la raíz del `setup` en camelCase.

---

## Los 5 Agentes

| Agente | Rol | Voz | Color | Emoji |
|--------|-----|-----|-------|-------|
| **Luna** | Escucha empática y validación emocional | Aoede | `#7B8FD4` | 🫂 |
| **Marco** | Guía de duelo y psicoeducación | Orus | `#6B9E8A` | 🧭 |
| **Serena** | Mindfulness, respiración y grounding | Kore | `#D4A574` | 🧘 |
| **Alma** | Narrativa terapéutica y significado | Leda | `#C47D8A` | 📖 |
| **Faro** | Soporte en crisis (activación automática) | Fenrir | `#E85D75` | 🚨 |

Cada agente tiene un `systemPrompt` especializado, avatar PNG, color temático, y voz diferenciada. Marco y Faro usan voces masculinas; Luna, Serena y Alma usan voces femeninas.

---

## Features Implementadas

### 1. Conversación de Voz en Tiempo Real
- Conexión WebSocket bidireccional con el modelo nativo de audio de Gemini
- Detección de actividad de voz (VAD) por RMS del audio capturado
- Indicadores visuales: "Hablando...", "Te estoy escuchando...", "Esperando..."
- Visualizador de audio con barras animadas en la parte inferior

### 2. Transcripción en Vivo (Subtítulos)
- Transcripción bidireccional (usuario ↔ agente) usando las capacidades nativas del modelo
- Fragmentos acumulados en un solo mensaje con burbuja de chat en vivo (con cursor parpadeante)
- Debounce de 600ms en `turnComplete` para capturar fragmentos tardíos
- Filtro de artefactos de control (`<ctrl46>`, etc.) del modelo de audio

### 3. Panel Lateral de Historial
- Panel lateral izquierdo siempre visible en desktop, colapsable en mobile
- Burbujas de chat estilizadas por speaker (usuario a la derecha, agente a la izquierda)
- Auto-scroll al nuevo mensaje
- Aplicación de PII masking a todo texto mostrado

### 4. Perfiles de Usuario Predefinidos (Context Cards)
- 5 perfiles de demo: Orlando (Chile), Mary (México), Rodrigo (Argentina), Carmen (España), Sin contexto
- Detección automática de país por IP (ipapi.co) con fallback a `navigator.language`
- El perfil seleccionado se inyecta como contexto en el `systemPrompt` del agente
- Cada perfil tiene nombre, edad, situación de duelo específica, país y emoji

### 5. Detección de Crisis y Escalación a Faro
- Function calling: `escalate_to_crisis_faro` disponible para todos los agentes
- Si el usuario expresa pensamientos suicidas o autolesión, el agente activa la tool
- El sistema reconecta automáticamente con Faro como agente activo
- Faro recibe un mensaje de contexto para responder inmediatamente
- Banner rojo permanente con número de crisis (*4141 Chile)
- Cambio de mensajes de status: "Estoy aquí contigo..." en lugar de "Esperando..."

### 6. Visualización de Emociones en Tiempo Real
- **Function calling:** `report_emotion` con parámetros `emotion` (8 emociones) e `intensity` (1-5)
- Todos los agentes excepto Faro reportan la emoción silenciosamente después de cada turno del usuario
- **UI:** Badge/pill debajo del nombre del agente con la emoción detectada y puntos de intensidad
- **Glow:** Capa radial secundaria en el fondo que mezcla el color de la emoción con opacidad proporcional a la intensidad
- **Emociones:** Tristeza, Enojo, Miedo, Culpa, Esperanza, Calma, Amor, Vacío — cada una con color distinto

### 7. Ejercicios de Respiración Guiados (Serena)
- **Function calling exclusivo de Serena:** `start_breathing_exercise` y `stop_breathing_exercise`
- `start_breathing_exercise` acepta: `type` (box/478/simple), `inhale_seconds`, `hold_seconds`, `exhale_seconds`, `cycles`
- Mínimos forzados: 4 segundos por fase, 4 ciclos mínimo
- **Componente `BreathingVisualizer`:**
  - Círculo animado que se expande (inhala), sostiene, contrae (exhala) con CSS transitions dinámicas
  - Fases: Inhala → Sostén → Exhala → Descansa (2s entre ciclos)
  - Texto de fase + duración en segundos
  - Contador de ciclos con indicadores de punto
  - Label de tipo: "Respiración cuadrada", "Técnica 4-7-8", "Respiración simple"
  - Al completar: estado "Ejercicio completo" con botón "Cerrar" (no auto-dismiss)
- El prompt de Serena obliga al uso del tool — nunca describe el ejercicio en texto

### 8. Input de Video/Cámara
- Toggle de cámara en el header (icono + indicador verde cuando activo)
- Captura de video: `getUserMedia` 640x480, canvas offscreen 320x240
- Espera `onloadeddata` antes de iniciar captura de frames (previene datos corruptos)
- Frames JPEG quality 0.6 enviados cada 1 segundo al modelo via `realtimeInput.mediaChunks`
- **PIP Preview:** Elemento `<video>` de 120x90px en esquina inferior derecha, espejado, con borde y sombra
- Polling de conexión stream → PIP (hasta 20 intentos/3s) para manejar la asincronía
- Limpieza completa de tracks y canvas al desactivar o desconectar

### 9. Resumen Post-Sesión
- Al salir con >2 mensajes: disconnect + pantalla de resumen en vez de salir directo
- **API:** Llamada REST a `gemini-2.5-flash:generateContent` con `maxOutputTokens: 4096`
- **Prompt:** Genera resumen compasivo en español con 4 secciones exactas
- **Secciones:** Resumen Emocional (💙), Temas Principales (📋), Recursos (🔗), Mensaje de Cierre (🌱)
- **Parser robusto:** Strips `###`, `**`, y otros formatos markdown antes de matchear títulos de sección
- Aplicación de `maskPII()` al resultado
- Botones: "Copiar resumen" (clipboard) y "Volver al inicio"
- States: loading spinner, error con retry, contenido renderizado

### 10. Código de Acceso (Access Gate)
- Si `NEXT_PUBLIC_ACCESS_CODE` está definida, la landing muestra un gate pidiendo código antes de mostrar los agentes
- Comparación client-side contra la env var
- Se persiste en `sessionStorage` para no pedir el código cada vez que se recarga
- Si la env var no está definida, el gate se omite y la demo es pública
- Ideal para proteger créditos de API durante demos/evaluaciones

### 11. Protección de Información Personal (PII Scrubber)
- Scrubbing client-side de números de teléfono, emails, y RUT/DNI chileno
- Se aplica a toda transcripción mostrada en UI (historial, burbuja live, resumen)
- Reemplazos: `[TELÉFONO OCULTO]`, `[EMAIL OCULTO]`, `[RUT/ID OCULTO]`

---

## Infraestructura de Tool Calls (Function Calling)

El hook `useGeminiLive` implementa un dispatcher completo de tool calls:

```
msg.toolCall.functionCalls → for...of loop:
  ├── escalate_to_crisis_faro → switchAgent(faro) + return (WS se cierra)
  ├── report_emotion → setEmotion({ emotion, intensity })
  ├── start_breathing_exercise → setBreathingExercise({ type, inhale, hold, exhale, cycles })
  └── stop_breathing_exercise → setBreathingExercise(null)

→ Envía toolResponse para TODOS los calls no-escalación:
  ws.send({ toolResponse: { functionResponses: [{ id, response: { result: { success: true } } }] } })
```

Las `functionDeclarations` se construyen dinámicamente por agente: todos reciben `escalate_to_crisis_faro` + `report_emotion`, y Serena además recibe `start_breathing_exercise` + `stop_breathing_exercise`.

---

## Estructura de Archivos

```
src/
├── app/
│   ├── page.js              # Landing page con access gate, selector de contexto + grid de agentes
│   ├── layout.js             # Layout root
│   ├── globals.css           # Estilos globales + Tailwind
│   └── favicon.ico
├── components/
│   ├── GeminiLiveSession.js  # UI de sesión: avatar, emociones, historial, PIP, visualizador
│   ├── BreathingVisualizer.js # Animación de respiración con fases y ciclos
│   └── SessionSummary.js     # Resumen post-sesión via REST API
├── hooks/
│   └── useGeminiLive.js      # Core hook: WebSocket, audio, video, tools, transcripción
└── lib/
    ├── agents.js             # Definición de los 5 agentes (prompts, voces, colores)
    ├── userContexts.js       # Perfiles de usuario + detección de país
    └── piiScrubber.js        # Masking de teléfonos, emails, RUT/DNI

public/
├── luna.png, marco.png, serena.png, alma.png, faro.png  # Avatares de agentes
├── sanemos_logo.png, sanemos_logo_2.png                  # Logo
└── [otros assets decorativos]
```

---

## Dependencias

| Paquete | Versión | Uso |
|---------|---------|-----|
| next | 16.1.6 | Framework |
| react | 19.2.3 | UI |
| tailwindcss | v4 | Estilos |
| ws | 8.19.0 | (server-side, no usado en client) |
| node-fetch | 3.3.2 | (server-side, no usado en client) |

> Todo el WebSocket y audio es client-side nativo del navegador (WebSocket API, AudioContext, getUserMedia).

---

## Deployment (Google Cloud Run)

**URL:** `https://sanemos-live-XXXXX.us-central1.run.app`

Deploy usando Cloud Build con `cloudbuild.yaml` (pasa las variables de entorno como `--build-arg` al Dockerfile):

```bash
# Setup inicial (una vez)
gcloud config set project sanemos-ai-live-demo
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com generativelanguage.googleapis.com

# Deploy (en PowerShell usar comillas alrededor de --substitutions)
gcloud builds submit --config cloudbuild.yaml \
  --substitutions="_NEXT_PUBLIC_GEMINI_API_KEY=tu-key,_NEXT_PUBLIC_ACCESS_CODE=tu-codigo"
```

> **Nota:** Las variables `NEXT_PUBLIC_*` de Next.js deben estar disponibles en **build time** (se incrustan en el bundle del cliente). El `cloudbuild.yaml` las pasa como `--build-arg` al `docker build`, garantizando que lleguen al `npm run build`.

### Configuración de API Key

La API key de Google Cloud **no debe tener restricción por HTTP Referrer**, ya que las conexiones WebSocket no envían header `Referer` y serían bloqueadas. Para proteger la key:

1. En Google Cloud Console → APIs & Services → Credentials → tu API key
2. Application restrictions: **None** (o restricción por IP)
3. API restrictions: Restringir solo a **Generative Language API**

---

## APIs de Google Utilizadas

1. **Gemini Multimodal Live API** (WebSocket) — Conversación de voz bidireccional en tiempo real con function calling
2. **Gemini REST API** (`gemini-2.5-flash:generateContent`) — Generación de resumen post-sesión
3. **Google Cloud Run** — Hosting de la aplicación Next.js

---

## Bugs Resueltos Durante el Desarrollo

- `speechConfig` en nivel incorrecto del setup message → moverlo dentro de `generationConfig`
- Mensajes cortados por `turnComplete` prematuro → debounce de 600ms
- Stale closures en `ws.onmessage` → `useRef` para acumulador de mensajes
- Audio cortado entre chunks → playback gapless con `source.start(scheduledTime)`
- React strict mode double-mount → verificación `wsRef.current !== ws` en handlers
- Media stream leak → guardar ref y stop tracks en cleanup
- Faro lento al activarse → reducir delays de reconexión
- `<ctrl46>` artifacts en transcripción → filtro regex en `cleanTranscript()`
- Video PIP sin imagen → polling async para conectar stream al elemento `<video>`
- Video crash 1011 → esperar `onloadeddata` + try-catch en cada frame
- Resumen cortado → `maxOutputTokens` de 1024 a 4096
- Secciones del resumen no parseadas → strip markdown formatting antes de matchear títulos
- Ejercicio de respiración demasiado rápido → mínimos forzados + rest phase + no auto-dismiss
- Emotion tracking agregado a Faro por error → removido manualmente
