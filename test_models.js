const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const match = envFile.match(/NEXT_PUBLIC_GEMINI_API_KEY=(.*)/);
const apiKey = match ? match[1].trim() : '';

async function run() {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    if (!data.models) {
        console.error(data);
        return;
    }
    const bidiModels = data.models.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('bidiGenerateContent'));
    console.log("Supported Models for BidiGenerateContent:");
    bidiModels.forEach(m => console.log(m.name));
}

run();
