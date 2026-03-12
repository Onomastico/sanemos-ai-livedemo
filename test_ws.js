const WebSocket = require('ws');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const match = envFile.match(/NEXT_PUBLIC_GEMINI_API_KEY=(.*)/);
const apiKey = match ? match[1].trim() : '';

const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

const ws = new WebSocket(url);

ws.on('open', () => {
    const setupMessage = {
        setup: {
            model: "models/gemini-2.5-flash-native-audio-latest",
            generationConfig: {
                responseModalities: ["AUDIO"]
            },
            systemInstruction: {
                parts: [{ text: "You are a test agent" }]
            }
        }
    };
    ws.send(JSON.stringify(setupMessage));
});

ws.on('message', (data) => {
    try {
        const msg = JSON.parse(data.toString());
        console.log("SUCCESS! Setup response received:", JSON.stringify(msg, null, 2));
        ws.close();
    } catch (e) {
        console.log("Received data:", data.toString());
    }
});

ws.on('close', (code, reason) => {
    fs.writeFileSync('error_dump.txt', `Code: ${code}\nReason: ${reason.toString()}`);
    console.log("Dumped to error_dump.txt");
});
