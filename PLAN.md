# Plan: Sanemos AI Live — Estado Actual

## Completado

### Fase 1: SDK Migration (✅)
- Migrado de WebSocket raw a `@google/genai` SDK (`ai.live.connect()`)
- SessionSummary usa `ai.models.generateContent()`
- SocialPostModal usa `ai.models.generateImages()` (Imagen 4)

### Fase 2: Features Core (✅)
- 8 agentes especializados (Sofía receptionist + 6 apoyo + Faro crisis)
- Conversación de voz bidireccional (16kHz in / 24kHz out gapless)
- Transcripción bidireccional con debounce 600ms
- Video input opcional (JPEG 320x240 @ 1fps)
- Detección de emociones (texto, voz, facial) con timeline
- Ejercicios de respiración guiados (Serena)
- Diario personal (localStorage)
- Integración terapeuta + citas
- Posts sociales con imágenes generadas por IA (Imagen 4)
- Generación visual para Marco (diagramas educativos) y Serena (imágenes mindfulness) con VisualModal
- Resumen post-sesión con IA
- Onboarding tour por voz (Sofía)
- i18n ES/EN (150+ keys)
- Tema dark/light/system
- Diagrama de arquitectura interactivo

### Fase 3: Robustez (✅)
- Barge-in / interrupción graceful (client-side RMS + server interrupted)
- `pauseAudioInputRef` para prevenir WS 1011 durante tool calls destructivos
- `pendingSwitchAgentIdRef` para completar switch en caso de 1011
- Faro excluido de `escalate_to_crisis_faro` (no auto-escalación)
- Auto-reconnect en 1008/1011
- Instrucciones de manejo de interrupción en system prompts

### Fase 4: Deploy (✅)
- Cloud Run (us-central1, 512Mi)
- Cloud Build CI/CD con `cloudbuild.yaml`
- Dockerfile multi-stage (Node 20 Alpine)
- Access code gate opcional

## Pendiente

(Sin features pendientes en backlog actual)
