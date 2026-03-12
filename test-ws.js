const WebSocket = require('ws');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
if (!apiKey) {
  console.error("No API key");
  process.exit(1);
}

const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
console.log("Connecting to:", url.split('?')[0]);

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('Connected');
  ws.close();
});

ws.on('error', (e) => {
  console.error('Error:', e);
});

ws.on('unexpected-response', (request, response) => {
  console.error('Unexpected response:', response.statusCode, response.statusMessage);
  response.on('data', chunk => {
    console.error('Response body:', chunk.toString());
  });
});
