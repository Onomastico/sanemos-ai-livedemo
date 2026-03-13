# Sanemos AI Live — Instrucciones para Claude Code

## 📋 Descripción del Proyecto

Sanemos AI Live es una plataforma de acompañamiento emocional en duelo con IA conversacional mediante **Gemini Multimodal Live API**. Permite conversaciones de voz bidireccionales en tiempo real con 8 agentes especializados: Sofía (receptionist), Luna, Marco, Serena, Alma, Nora, Iris y Faro (crisis).

**Stack:** Next.js 16 · React 19 · Tailwind CSS v4 · Gemini Live API (WebSocket)

---

## 🎯 Features Principales

### 1. **Agente Recepcionista (Sofía)**
- Saluda y rutea usuarios hacia agentes especializados
- Activa automáticamente al clickear avatar de Sofía en landing
- Ofrece tour onboarding detallado (10 temas) para nuevos usuarios
- Speech bubbles decorativas alrededor del avatar mostrando comandos de ejemplo
- Excluida de emotion tools (solo routing)
- Flag: `isReceptionist: true`

### 2. **Diario Personal**
- Storage en localStorage (`sanemos_diary`)
- Modal expandible: ver resumen + transcripción + eliminar
- Guardado automático desde sesiones o botón en SessionSummary
- Tool: `save_diary_entry` (todos excepto Faro)

### 3. **Terapeuta & Citas**
- Dra. María Torres hardcodeada
- Slots de citas: próximos 3 días hábiles × 3 horarios (10:00, 15:00, 17:00)
- Storage en localStorage (`sanemos_appointments`)
- Tools: `send_to_therapist`, `schedule_appointment` (picker visual), `book_appointment` (con día/hora)

### 4. **Conversación de Voz Multimodal**
- WebSocket directo a Gemini Live API
- Audio captura (16kHz) + playback (24kHz gapless)
- Transcripción bidireccional con debounce 600ms
- Video opcional (JPEG 320x240 @ 1fps)

### 5. **Detección de Emociones**
- Tres emotion tools: `report_text_emotion`, `report_voice_emotion`, `report_facial_emotion`
- Timeline de emociones en SessionSummary
- Excluidas para Sofía (no hace acompañamiento)

### 6. **Resumen Post-Sesión**
- Generado con Gemini REST API
- 4 secciones: Emocional, Temas, Recursos, Cierre
- Botones: "Guardar en Diario", "Enviar a Terapeuta"
- Cerrable por voz via `dismiss_modal` (usa `dismissSummaryCallbackRef`)

### 7. **Tema Claro/Oscuro/Sistema**
- ThemeProvider con 3 modos: dark, light, system
- Persistencia en localStorage (`sanemos_theme`)
- FOUC prevention con inline script en `<head>`
- CSS variables en `.dark` / `.light` selectors
- ThemeToggle pill en toolbar (junto a LanguageToggle)

### 8. **Página de Arquitectura**
- Diagrama interactivo en `/architecture`
- Respeta tema de color e idioma (i18n completo con claves `arch.*`)
- ThemeToggle + LanguageToggle integrados

---

## 🛠️ Arquitectura de Tools

### Por Agente
```
TODOS:
  - escalate_to_crisis_faro (sin toolResponse)
  - end_session (sin toolResponse)
  - switch_agent (sin toolResponse)
  - UI tools: generate_social_post, copy_to_clipboard, open_url, dismiss_modal
  - show_diary, show_appointments

EXCEPTO SOFÍA:
  - report_emotions / report_text_emotion / report_voice_emotion / report_facial_emotion
  - save_diary_entry (si messages.length > 2)
  - send_to_therapist (si messages.length > 2)
  - schedule_appointment (picker visual)
  - book_appointment (con preferred_day + preferred_time)

EXCEPTO FARO:
  - (todos los anteriores)

SOLO SERENA:
  - start_breathing_exercise
  - stop_breathing_exercise

SOLO SOFÍA:
  - mark_onboarding_done
```

### Validaciones de Seguridad
- `save_diary_entry` y `send_to_therapist` requieren sesión real (messages > 2)
- `schedule_appointment` funciona siempre (no requiere sesión)
- Destructive tools no envían `toolResponse`

---

## 📁 Estructura Clave

```
src/
├── lib/
│   ├── agents.js          # 8 agentes con systemPrompts
│   ├── diary.js           # CRUD diary + localStorage
│   ├── therapist.js       # THERAPIST, slots, appointments
│   └── userContexts.js    # Perfiles + detección país
├── components/
│   ├── GeminiLiveSession.js    # Core UI + modales
│   ├── SessionSummary.js       # Resumen + botones
│   ├── DiaryModal.js           # Modal diario
│   ├── TherapistModal.js       # Modal terapeuta
│   ├── AppointmentModal.js     # Modal citas
│   ├── BreathingVisualizer.js  # Ejercicios respiración
│   ├── LanguageToggle.js       # Toggle ES/EN
│   └── ThemeToggle.js          # Toggle dark/light/system
├── hooks/
│   └── useGeminiLive.js        # WebSocket + handlers + states
├── theme/
│   └── ThemeContext.js          # ThemeProvider + useTheme
└── i18n/
    ├── I18nContext.js     # I18nProvider + useI18n
    ├── es.json            # 150+ claves español
    └── en.json            # 150+ claves inglés
```

---

## ⚙️ Configuración Necesaria

### .env.local
```
NEXT_PUBLIC_GEMINI_API_KEY=<tu-api-key>
NEXT_PUBLIC_ACCESS_CODE=<opcional-para-demo>
```

### API Key de Google Cloud
- **No** debe tener restricción por HTTP Referrer (WebSocket no envía Referer)
- Restricción recomendada: Generative Language API + Application restrictions (IP o None)

### Variables de Build
- Las `NEXT_PUBLIC_*` se incrustan en el cliente en build time
- Para Cloud Run, usar `cloudbuild.yaml` con `--build-arg`

---

## 🔄 Flujos Principales

### 1. Usuario Nuevo
```
Landing → Click avatar Sofía → Sofía (isFirstVisit=true)
  → Sofía ofrece tour onboarding detallado por voz (10 temas)
  → Usuario acepta → Sofía cubre: agentes, comandos de voz, diario, terapeuta, citas, posts, respiración, cámara, settings, privacidad
  → Sofía llama mark_onboarding_done
  → localStorage setItem("sanemos_onboarding_done", "true")
  → Sofía routea con switch_agent hacia agente elegido
```

### 2. Guardar Sesión en Diario
```
SessionSummary renderiaza → Usuario clickea "📔 Guardar en Diario"
  → saveDiaryEntry(summary, agent, messages, emotionHistory)
  → localStorage actualiza sanemos_diary
  → Toast: "Guardado en tu diario"
```

### 3. Enviar a Terapeuta
```
SessionSummary renderiaza → Usuario clickea "👩‍⚕️ Enviar a Terapeuta"
  → TherapistModal abre
  → Usuario puede copiar summary para email
  → O clickea "Agendar cita" → AppointmentModal
  → Selecciona slot → bookAppointment()
  → localStorage actualiza sanemos_appointments
```

---

## 🐛 Bugs Conocidos & Soluciones

### Audio & WebSocket
- ✅ `speechConfig` debe estar en `generationConfig`
- ✅ Debounce 600ms en `turnComplete` para transcripción completa
- ✅ Playback gapless requiere `source.start(scheduledTime)` preciso
- ✅ useRef para stale closure en ws.onmessage

### Diary & Therapist
- ✅ Verificar `messages.length > 2` antes de save/send
- ✅ `isReceptionist` flag para excluir Sofía de grid
- ✅ Emotion tools excluidas para Sofía en buildFunctionDeclarations
- ✅ Keys localStorage únicas: `sanemos_diary`, `sanemos_appointments`
- ✅ `dismiss_modal` cierra SessionSummary via `dismissSummaryCallbackRef`
- ✅ `book_appointment` vs `schedule_appointment`: Sofía usa `book_appointment` cuando el usuario especifica día/hora
- ✅ Diary save via voz no se perdía por nullificar `lastSessionDataRef` después de save

---

## 📝 Convenciones de Código

### Nombres de Variables
- Estado de UI: `show*`, `is*`, `set*`
- Refs: `*Ref`
- Handlers: `handle*`
- Utilities: `get*`, `format*`, `build*`

### Tool Calls
- Destructive (end_session, switch_agent, escalate): `return` sin toolResponse
- No-destructive: siempre enviar toolResponse
- Safety checks: `messages.length > 2` para diary/therapist

### i18n Keys
- Formato: `page.`, `session.`, `diary.`, `therapist.`, `toast.`, `agents.`, `arch.`
- Fallback: inglés por defecto si no existe traducción

---

## 🚀 Deployment

### Desarrollo Local
```bash
npm run dev
# Puerto 3001 (3000 puede estar en uso)
```

### Build
```bash
npm run build
# Verifica: ✓ Compiled successfully
```

### Cloud Run (Google Cloud)
```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions="_NEXT_PUBLIC_GEMINI_API_KEY=...,_NEXT_PUBLIC_ACCESS_CODE=..."
```

---

## 📚 Documentación Relacionada

- `DEMO_OVERVIEW.md`: Arquitectura técnica detallada
- `specs.md`: Especificaciones iniciales
- `tasks/todo.md`: Tareas pendientes (actualizar según cambios)
- `src/app/architecture/page.js`: Diagrama interactivo

---

## ✅ Checklist para Nuevas Features

1. ¿Necesita nueva tool? → Agregar en `buildFunctionDeclarations`
2. ¿Necesita UI? → Crear Modal + estilos CSS modules
3. ¿Necesita storage? → Usar localStorage con key única `sanemos_*`
4. ¿Necesita i18n? → Agregar keys en es.json + en.json
5. ¿Afecta sistema de agents? → Actualizar `agents.js` + tests
6. ¿Es para todos o agente específico? → Usar `agentId` para condicionales
7. ¿Necesita seguridad? → Implementar validación (ej: messages.length > 2)
8. ¿Finalizar sesión?
   - Destructive → No enviar toolResponse, usar `closingIntentionallyRef`
   - Normal → Enviar toolResponse siempre

---

## 🤝 Notas Finales

- **Prioridad:** Mantener bajo latency (WebSocket directo, no servidor intermediario)
- **Compatibilidad:** Next.js 16 con Turbopack, React 19
- **Seguridad:** PII scrubbing client-side, API key en env, no revelar en logs
- **Accesibilidad:** i18n ES/EN, responsive mobile-first, tema claro/oscuro/sistema
- **Testing:** Build local before pushing, verificar con `npm run build`

---

**Última actualización:** 2026-03-13
**Versión:** 0.4 (tema claro/oscuro, burbujas Sofía, tour detallado, book_appointment, dismiss_modal fix, arquitectura i18n)
