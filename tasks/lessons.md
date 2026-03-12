# Lessons Learned

## WebSocket on Gemini Multimodal Live API
- The browser hides WebSocket connection error details (like HTTP 403 Forbidden) for security reasons. If the API key has an HTTP referrer restriction, `new WebSocket(url)` will fail immediately with `WebSocket Error: {}`.
- To debug, testing the endpoint via a plain Node.js script can reveal if the connection is successful without origin restrictions.
- `String.fromCharCode.apply(null, ...)` throws `RangeError: Maximum call stack size exceeded` for large arrays. When converting audio streams (PCM Int16Array) to base64, iterate over the `Uint8Array` to build a binary string instead.
- Added explicit `ws.onclose` error handling to correctly inform the user of abnormal disconnections like invalid message format or API Key restrictions (where the server might close with a 1008 or 4000 code).
