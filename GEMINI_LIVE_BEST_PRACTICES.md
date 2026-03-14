# Gemini Live API — Best Practices & Lessons Learned

## Root Cause: WS 1011 During Tool Calls

The audio worklet continuously sends `sendRealtimeInput` while the model processes a tool call. The server's VAD interprets microphone audio as barge-in/interruption, cancels the pending tool call, and crashes with 1011.

**Why:** Google's docs state: "When VAD detects an interruption, ongoing generation is canceled and discarded. The server discards any pending function calls." Audio streaming during tool call processing creates a conflict.

**Mitigation:** Pause audio input (`sendRealtimeInput`) when destructive tool calls arrive (switch_agent, end_session, escalate_to_crisis_faro). Set a `pauseAudioInputRef` flag checked in the worklet's `onmessage` before sending audio. Reset on new session connect.

## Known Issues (Native Audio Models + Tool Calls)

- **googleapis/js-genai#1210**: EOS/turnComplete signal not enforced after tool emission. VAD overly sensitive to silence/background noise after tool trigger. ~50% tool call failure rate in tests. Filed as internal Google bug (Dec 2025).
- **googleapis/python-genai#843**: Function calling inconsistent with `gemini-2.5-flash-preview-native-audio-dialog`. Model sometimes outputs text descriptions of tool calls instead of executing them.
- **googleapis/python-genai#803**: API hangs on function call attempts.
- **googleapis/python-genai#789**: Model vocalizes tool metadata ("tool_outputs").

## Tool Call Behavior Modes

- **Blocking (default)**: Execution pauses until function result available. Model stops generating.
- **NON_BLOCKING**: Function runs async; model continues generating. Response scheduling:
  - `INTERRUPT`: Model stops and addresses result immediately
  - `WHEN_IDLE`: Model waits until current task finishes
  - `SILENT`: Model absorbs result without responding

**Usage:** Use `NON_BLOCKING` + `SILENT` for observation tools (emotions, etc.). Keep switch_agent/end_session as blocking (default) since they need model to stop.

## Session Management

- **Session timeout**: ~10-15 min (audio-only), ~2 min (audio+video). Server sends `GoAway` message ~1 min before disconnect.
- **Session resumption**: Use `sessionResumption` field in setup config. Cache `SessionResumptionUpdate` tokens (valid 2 hours). On 1011, reconnect with token to resume seamlessly.
- **Context window compression**: Configure `contextWindowCompression` in setup for sessions beyond 15 min.

## Audio Best Practices

- Send audio chunks in 20-40ms intervals
- When server sends `interrupted`, immediately discard audio playback buffer
- Reduce number of tools per agent (consolidate where possible)
- Separate tool definitions into distinct sentences in descriptions

## Setup Message Format

- `inputAudioTranscription` and `outputAudioTranscription` go at **setup root level**, NOT inside `generationConfig`
- Use **camelCase** for these fields (snake_case is rejected)
- `generationConfig` only contains `responseModalities: ["AUDIO"]`

## SDK Lessons (`@google/genai`)

- `sendRealtimeInput` uses `audio`/`video` params, NOT `mediaChunks`
- `sendToolResponse` requires both `name` AND `id` in each `functionResponse`
- Use `ai.live.connect()` for WebSocket sessions
- Use `ai.models.generateContent()` for REST API calls (summaries)
- Use `ai.models.generateImages()` for Imagen (social post images)
