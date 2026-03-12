import fs from 'fs';
import WebSocket from 'ws';

const env = fs.readFileSync('.env.local', 'utf-8');
const match = env.match(/NEXT_PUBLIC_GEMINI_API_KEY=([^\r\n]+)/);
const apiKey = match ? match[1] : null;

if (!apiKey) {
    console.error("No API key");
    process.exit(1);
}

const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

const ws = new WebSocket(url);

ws.on('open', () => {
    console.log('Connected');
    
    const setupMessage = {
        setup: {
            model: "models/gemini-2.5-flash-native-audio-latest",
            generationConfig: {
                responseModalities: ["AUDIO"]
            }
        }
    };
    ws.send(JSON.stringify(setupMessage));
});

ws.on('message', (data) => {
    console.log('Message:', data.toString());
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
ws.on('close', (code, reason) => {
    console.log('Closed', code, reason.toString());
})
