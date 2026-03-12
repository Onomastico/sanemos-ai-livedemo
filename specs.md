# Sanemos Live AI Demo - Specifications

## Overview
Sanemos Live AI is a Next.js-based web application that serves as a demonstration of real-time, ultra-low latency multimodal emotional support agents. The application leverages the Google Gemini API (specifically `GenerativeService.BidiGenerateContent` over WebSockets) to provide native voice-to-voice and text streaming interactions.

## Architecture & Features

### 1. Agents System
- **Predefined Agents:** The system includes structured emotional support AI agents (e.g., Sofía, Mateo, Clara, etc.) designed using custom system prompts.
- **Agent Roles:** Each agent has specific traits, focus areas (e.g., stress, anxiety, burnout, grief), and an associated persona to build rapport.
- **Faro (Crisis Escalation):** If a user expresses suicidal thoughts, self-harm, or severe distress, the active agent immediately triggers the `escalate_to_crisis_faro` tool. The interface overrides the active agent's avatar, switches to a critical theme (red visual cues), and Faro takes control with a firm, deeply compassionate, and direct approach to ensure user safety.

### 2. Capabilities
- **Gemini Multimodal Live API Integration:** Uses the WebSocket protocol to send raw PCM audio from the user's microphone directly to the Gemini model (e.g., `gemini-2.5-flash-native-audio-latest`).
- **Real-Time Delivery:** Receives base64-encoded audio responses from the model and streams them back to the user via the browser's Web Audio API. 
- **Text Transcripts:** In parallel to audio, receives real-time text transcription and AI responses to display them on the screen.
- **PII Scrubbing:** Applies a client-side RegEx-based filter (`lib/piiScrubber.js`) to sanitize personally identifiable information (emails, RUT/IDs, phone numbers, credit cards) from text transcripts before rendering.

### 3. Connection Handling
- The connection is initiated on the client-side using `useGeminiLive.js`, taking the API key supplied by the user.
- It is susceptible to standard WebSocket errors if the API Key provided has HTTP or origin restrictions (as WSS does not cleanly pass origins to restricted keys without server configurations).

### 4. User Interface
- Employs a Bento Box-styled card system on the landing page for selecting agents.
- Provides a modal/full-screen interface `GeminiLiveSession.js` per session, featuring a pulsating avatar synchronized with audio, real-time transcript streaming, and a voice visualizer.
