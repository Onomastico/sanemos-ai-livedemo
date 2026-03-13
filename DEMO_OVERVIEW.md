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

## Los 8 Agentes

| Agente | Rol | Voz | Color | Emoji | Tipo |
|--------|-----|-----|-------|-------|------|
| **Sofía** | Recepcionista y routing de usuarios | Aoede | `#5FB7A6` | 👋 | Receptionist |
| **Luna** | Escucha empática y validación emocional | Aoede | `#7B8FD4` | 🫂 | Apoyo |
| **Marco** | Guía de duelo y psicoeducación | Orus | `#6B9E8A` | 🧭 | Apoyo |
| **Serena** | Mindfulness, respiración y grounding | Kore | `#D4A574` | 🧘 | Apoyo |
| **Alma** | Narrativa terapéutica y significado | Leda | `#C47D8A` | 📖 | Apoyo |
| **Nora** | Apoyo para pérdida de mascotas | Kore | `#C9956C` | 🐾 | Apoyo |
| **Iris** | Separación, divorcio y transformación | Leda | `#9D7BA8` | ✨ | Apoyo |
| **Faro** | Soporte en crisis (activación automática) | Fenrir | `#E85D75` | 🚨 | Crisis |

- **Sofía** es el agente receptor inicial (aparece al clickear "Comenzar") que saluda y rutea a los usuarios hacia los agentes especializados
- Todos los agentes tienen `systemPrompt` especializado, avatar PNG, color temático, y voz diferenciada
- Sofía tiene flag `isReceptionist: true` para filtrarla de la grilla principal
- Sofía es excluida de emotion tools pero tiene acceso a herramientas de diario y terapeuta

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
- 7 perfiles de demo: Orlando, Mary, Rodrigo, Carmen, Lucía (pet loss), Pablo (separación), Sin contexto
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
- **Function calling:** `report_text_emotion`, `report_voice_emotion`, `report_facial_emotion` (o unificado `report_emotions`) con parámetros de emoción e intensidad
- Todos los agentes excepto Faro reportan la emoción silenciosamente después de cada turno del usuario
- **UI:** Badge/pill debajo del nombre del agente con la emoción detectada y puntos de intensidad
- **Glow:** Capa radial secundaria en el fondo que mezcla el color de la emoción con opacidad proporcional a la intensidad
- **Emociones:** Tristeza, Enojo, Miedo, Culpa, Esperanza, Calma, Amor, Vacío, Concentración, Sorpresa, Alegría, Ansiedad, Confusión, Gratitud — cada una con color distinto

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
- **Prompt:** Genera resumen compasivo en el idioma del usuario con 4 secciones exactas
- **Secciones:** Resumen Emocional (💙), Temas Principales (📋), Recursos (🔗), Mensaje de Cierre (🌱)
- **Parser robusto:** Strips `###`, `**`, y otros formatos markdown antes de matchear títulos de sección
- No se aplica `maskPII()` al resumen generado (causa falsos positivos en palabras genéricas)
- Botones: "Copiar resumen", "Guardar en Diario", "Enviar a Terapeuta", "Volver al inicio"
- Cerrable por voz via `dismiss_modal` tool (usa `dismissSummaryCallbackRef`)
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

### 12. Diario Personal (Personal Diary)
- **Storage:** localStorage con clave `sanemos_diary`
- **Modal:** `DiaryModal` con lista de entradas expandibles, ordenadas por fecha descendente
- **Datos por entrada:** id, date, title, agentName, agentId, summary, emotionTimeline, transcript
- **Tool:** `save_diary_entry` (disponible para todos los agentes excepto Faro)
- **Acceso:** Botón 📔 en toolbar de la landing page
- **Funcionalidad:** Ver resumen + transcripción completa, eliminar entradas con confirmación

### 13. Integración con Terapeuta
- **Terapeuta hardcodeada:** Dra. María Torres, especialista en duelo (15 años experiencia)
- **Contact:** Teléfono y email para contacto directo
- **Tools:**
  - `send_to_therapist`: Abre modal para compartir resumen de sesión
  - `schedule_appointment`: Abre modal visual para navegar slots disponibles
  - `book_appointment`: Reserva directa con `preferred_day` + `preferred_time` (ej: "miércoles a las 17")
- **Modal TherapistModal:** Muestra info terapeuta + botón para copiar resumen formateado al email
- **Modal AppointmentModal:** Grid de slots disponibles (próximos 3 días hábiles × 3 horarios: 10:00, 15:00, 17:00)
- **Storage de citas:** localStorage con clave `sanemos_appointments`
- **Accesibilidad:** Botones en SessionSummary: "Guardar en Diario" y "Enviar a Terapeuta"

### 14. Agente Recepcionista (Sofía)
- **Rol:** Bienvenida, routing y onboarding
- **Flow:**
  1. Usuario clickea avatar de Sofía en landing (círculo con foto + "Hablar con Sofía")
  2. Speech bubbles decorativas alrededor del avatar muestran comandos de ejemplo
  3. Sofía saluda warmly y presenta opciones de agentes
  4. Usuario pide hablar con agente específico o usa funciones (diario, terapeuta, citas)
  5. Sofía routea con `switch_agent` hacia el agente elegido
- **Onboarding:** Si es primera visita (`isFirstVisit`), Sofía ofrece tour detallado por voz cubriendo 10 temas: qué es Sanemos, los 7 agentes, comandos de voz, diario, terapeuta/citas, posts sociales, respiración, cámara, settings, privacidad
- **Tool exclusiva:** `mark_onboarding_done` para marcar localStorage después del tour
- **Exclusiones:** No tiene emotion tools (no hace acompañamiento), pero tiene access a diary/therapist tools
- **Filtrado:** Sofía se filtra de la grilla de agentes con `filter(a => !a.isReceptionist)`
- **Grid visual:** Los agentes aparecen en un contenedor visual "dentro de la sección de Sofía", con Faro separado y estilizado con colores rojos de crisis

### 15. Tema Claro / Oscuro / Sistema
- **ThemeProvider** con 3 modos: dark, light, system
- **CSS variables:** `.dark` y `.light` selectors con ~20 tokens cada uno
- **Tailwind v4:** `@theme` registration de colores semánticos (`bg-bg`, `text-fg`, `text-accent`, etc.)
- **FOUC prevention:** Inline script en `<head>` lee localStorage antes de hidratación
- **ThemeToggle:** Pill de 3 segmentos (sol/monitor/luna)
- **Persistencia:** localStorage key `sanemos_theme`

### 16. Página de Arquitectura Interactiva
- **Ruta:** `/architecture`
- **i18n completo:** 60+ claves `arch.*` en ES y EN
- **ThemeProvider + ThemeToggle + LanguageToggle** integrados
- **Secciones:** Client Browser ↔ Gemini API, 8 Agents, Tool System, Key Features, Data Flow
- **Colores:** Usa tokens del tema (no hardcodeados)

---

## Infraestructura de Tool Calls (Function Calling)

El hook `useGeminiLive` implementa un dispatcher completo de tool calls:

```
msg.toolCall.functionCalls → for...of loop:
  ├── escalate_to_crisis_faro → switchAgent(faro) + return (WS se cierra)
  ├── end_session → closingIntentionallyRef=true + waitForAudio (8s max) + return
  ├── switch_agent → closingIntentionallyRef=true + onSwitchAgent(agentId) + return
  ├── report_emotions / report_text_emotion / report_voice_emotion / report_facial_emotion → setEmotion + setEmotionHistory
  ├── start_breathing_exercise → setBreathingExercise({ type, inhale, hold, exhale, cycles })
  ├── stop_breathing_exercise → setBreathingExercise(null)
  ├── generate_social_post → setSocialPost({ platform, post_text, occasion })
  ├── copy_to_clipboard → navigator.clipboard.writeText() + setUiToast
  ├── open_url → window.open(url, '_blank') + setUiToast
  ├── dismiss_modal → setSocialPost(null) + setShowDiaryModal(false) + setShowAppointmentsModal(false) + dismissSummaryCallbackRef()
  ├── show_diary → setShowDiaryModal(true)
  ├── show_appointments → setShowAppointmentsModal(true)
  ├── save_diary_entry → setDiaryAction({ type: 'save', title }) [si messages.length > 2]
  ├── send_to_therapist → setTherapistAction({ type: 'send', summary_text }) [si messages.length > 2]
  ├── schedule_appointment → setShowAppointment(true) [picker visual]
  ├── book_appointment → match preferred_day+preferred_time → bookAppointment(slot) [reserva directa]
  └── mark_onboarding_done → localStorage.setItem('sanemos_onboarding_done', 'true')

→ Envía toolResponse para TODOS los calls no-destructivos:
  ws.send({ toolResponse: { functionResponses: [{ id, response: { result: { success: true } } }] } })
```

Las `functionDeclarations` se construyen dinámicamente por agente:
- **Todos:** `escalate_to_crisis_faro`, `end_session`, `switch_agent`, UI tools
- **Excepto Sofía:** Emotion tools
- **Excepto Faro:** `save_diary_entry`, `send_to_therapist`, `schedule_appointment`, `book_appointment`
- **Solo Serena:** `start_breathing_exercise`, `stop_breathing_exercise`
- **Solo Sofía:** `mark_onboarding_done`

**Edge cases:**
- `save_diary_entry` y `send_to_therapist` verifican `messages.length > 2` (safety: requieren sesión real)
- `schedule_appointment` siempre funciona (no requiere sesión previa)
- Destructive tools (`end_session`, `switch_agent`, `escalate_to_crisis_faro`) no envían `toolResponse`

---

## Estructura de Archivos

```
src/
├── app/
│   ├── page.js                    # Landing page: access gate, contexto, botón "Comenzar", grid de agentes, diary modal
│   ├── architecture/page.js       # Diagrama interactivo de arquitectura con agentes, tools, features
│   ├── layout.js                  # Layout root
│   ├── globals.css                # Estilos globales + Tailwind
│   └── favicon.ico
├── components/
│   ├── GeminiLiveSession.js       # UI de sesión: avatar, emociones, historial, PIP, modales integrados
│   ├── SessionSummary.js          # Resumen post-sesión via REST API + botones Diary/Therapist
│   ├── BreathingVisualizer.js     # Animación de respiración con fases y ciclos
│   ├── DiaryModal.js              # Modal de diario personal con lista expandible de entradas
│   ├── DiaryModal.module.css      # Estilos de diario
│   ├── TherapistModal.js          # Modal con info terapeuta + opción de copiar para email
│   ├── TherapistModal.module.css  # Estilos de terapeuta
│   ├── AppointmentModal.js        # Modal de agendar citas con grid de slots
│   ├── AppointmentModal.module.css # Estilos de citas
│   ├── SocialPostModal.js         # Modal de posts de redes sociales
│   ├── LanguageToggle.js          # Toggle ES/EN
│   ├── ThemeToggle.js             # Toggle dark/light/system
│   ├── SettingsPanel.js           # Panel de configuración de API
│   ├── OnboardingOverlay.js       # Tour de onboarding (legacy)
│   └── EmotionTimeline.js         # Línea temporal de emociones
├── hooks/
│   └── useGeminiLive.js           # Core hook: WebSocket, audio, video, tools, modales, diary/therapist
├── lib/
│   ├── agents.js                  # Definición de 8 agentes: Sofía, Luna, Marco, Serena, Alma, Nora, Iris, Faro
│   ├── diary.js                   # Funciones: loadDiary, saveDiaryEntry, deleteDiaryEntry, formatDiaryDate
│   ├── therapist.js               # THERAPIST const, getAvailableSlots, bookAppointment, getAppointments
│   ├── userContexts.js            # Perfiles de usuario + detección de país
│   ├── piiScrubber.js             # Masking de teléfonos, emails, RUT/DNI
│   ├── lightweightNerModel.js     # NER browser-safe para nombres, ubicaciones
│   └── gemini-api-notes.md        # Notas de configuración de API (legacy)
├── theme/
│   └── ThemeContext.js            # ThemeProvider + useTheme (dark/light/system)
└── i18n/
    ├── I18nContext.js             # Context de internacionalización
    ├── es.json                    # Traducciones español (150+ keys)
    └── en.json                    # Traducciones inglés (150+ keys)

public/
├── sofia.png, luna.png, marco.png, serena.png, alma.png, nora.png, iris.png, faro.png  # Avatares
├── sanemos_logo.png, sanemos_logo_2.png                                                 # Logos
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

### Fase 1: Audio & WebSocket
- `speechConfig` en nivel incorrecto del setup message → moverlo dentro de `generationConfig`
- Mensajes cortados por `turnComplete` prematuro → debounce de 600ms
- Stale closures en `ws.onmessage` → `useRef` para acumulador de mensajes
- Audio cortado entre chunks → playback gapless con `source.start(scheduledTime)`
- React strict mode double-mount → verificación `wsRef.current !== ws` en handlers
- Media stream leak → guardar ref y stop tracks en cleanup
- `<ctrl46>` artifacts en transcripción → filtro regex en `cleanTranscript()`

### Fase 2: Video & Features
- Faro lento al activarse → reducir delays de reconexión
- Video PIP sin imagen → polling async para conectar stream al elemento `<video>`
- Video crash 1011 → esperar `onloadeddata` + try-catch en cada frame
- Resumen cortado → `maxOutputTokens` de 1024 a 4096
- Secciones del resumen no parseadas → strip markdown formatting antes de matchear títulos
- Ejercicio de respiración demasiado rápido → mínimos forzados + rest phase + no auto-dismiss
- Emotion tracking agregado a Faro por error → removido manualmente

### Fase 3: Diary, Therapist, Sofía
- `save_diary_entry` sin sesión → verificación `messages.length > 2` antes de guardar
- `send_to_therapist` sin contexto → pasar `summary_text` desde tool args
- Sofía aparecía en grid de agentes → agregar flag `isReceptionist` + filtro en getAllAgents
- Emotion tools para Sofía → excluir en buildFunctionDeclarations basado en `agentId === 'sofia'`
- Onboarding no se detectaba → usar `isFirstVisit` prop en GeminiLiveSession
- localStorage key collision → usar `sanemos_diary` y `sanemos_appointments` como keys únicas
- `dismiss_modal` no cerraba SessionSummary → agregar `dismissSummaryCallbackRef` (ref callback pattern entre hook y componente)
- `book_appointment` no usado por Sofía → actualizar system prompt para distinguir `schedule_appointment` (picker) vs `book_appointment` (reserva directa)
- Diary save via voz no persistía → `lastSessionDataRef.current = null` después de save destruía el componente SessionSummary
- SessionSummary no se podía scrollear/cerrar → separar flex centering del overflow-y-auto con divs anidados
- SessionSummary AI summary no debe pasar por `maskPII()` → causa falsos positivos en palabras genéricas
