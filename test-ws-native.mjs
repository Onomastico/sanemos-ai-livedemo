import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const match = env.match(/NEXT_PUBLIC_GEMINI_API_KEY=([^\r\n]+)/);
const apiKey = match ? match[1] : null;

if (!apiKey) {
    console.error("No API key");
    process.exit(1);
}

const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

const ws = new WebSocket(url);

ws.onopen = () => {
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
};

ws.onmessage = async (event) => {
    const data = event.data instanceof Blob ? await event.data.text() : event.data;
    console.log('Message:', data);
};

ws.onerror = (e) => {
    console.error('Error:', e.message || 'Unknown error');
};

ws.onclose = (e) => {
    console.log('Closed', e.code, e.reason);
};
