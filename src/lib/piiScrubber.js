/**
 * Browser-safe PII Scrubber for Gemini Live UI transcripts
 * Identifies phone numbers, emails, and routine ID formats (RUT/DNI)
 * and masks them before displaying on screen.
 */

export function maskPII(text) {
    if (!text) return text;

    let scrubbed = text;

    // 1. Phone numbers: 8-15 digits, optional + or spaces/dashes
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
    scrubbed = scrubbed.replace(phoneRegex, '[TELÉFONO OCULTO]');

    // 2. Email addresses
    const emailRegex = /([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})/g;
    scrubbed = scrubbed.replace(emailRegex, '[EMAIL OCULTO]');

    // 3. RUT/DNI (Chilean style 12.345.678-9 or 12345678-9)
    const rutRegex = /\b\d{1,2}\.?\d{3}\.?\d{3}[-Kk0-9]{2}\b/g;
    scrubbed = scrubbed.replace(rutRegex, '[RUT/ID OCULTO]');

    return scrubbed;
}
