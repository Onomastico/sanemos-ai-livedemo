const PERSON_CONTEXT_WORDS = new Set([
    // Emotional / grief context
    'extrano', 'extraño', 'recuerdo', 'pienso', 'duele', 'aniversario', 'cumpliria',
    'cumpliría', 'hoy', 'ayer', 'manana', 'mañana', 'fallecio', 'fallecía', 'murio', 'murió',
    'perdimos', 'perdi', 'perdí',
    // Self-introduction
    'soy', 'llamo', 'nombre', 'llamaba',
    // Family / relationships
    'mama', 'mamá', 'papa', 'papá', 'padre', 'madre',
    'hermano', 'hermana', 'hijo', 'hija', 'hijos',
    'abuela', 'abuelo', 'abuelita', 'abuelito',
    'tio', 'tía', 'tia', 'primo', 'prima',
    'esposo', 'esposa', 'marido', 'mujer', 'novio', 'novia', 'pareja',
    'amigo', 'amiga', 'companero', 'compañero', 'compañera',
    'sobrino', 'sobrina', 'cunado', 'cuñado', 'cuñada',
    'suegro', 'suegra', 'nuera', 'yerno',
    // Prepositions / connectors
    'mi', 'mio', 'mía', 'mia', 'de', 'a', 'con', 'en',
]);

const PERSON_STOP_WORDS = new Set([
    'Hoy', 'Ayer', 'Manana', 'Mañana', 'Lunes', 'Martes', 'Miercoles', 'Miércoles', 'Jueves', 'Viernes', 'Sabado', 'Sábado', 'Domingo',
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
    'Hospital', 'Clinica', 'Clínica', 'Centro', 'Plaza', 'Parque', 'Calle', 'Avenida', 'Av', 'Pasaje', 'Comuna', 'Ciudad', 'Barrio', 'Puente',
    'Población', 'Poblacion', 'Villa', 'Sector', 'Cerro', 'Camino', 'Ruta', 'Esquina', 'Condominio',
    'Doña', 'Don',
]);

const LOCATION_HEADS = new Set([
    'plaza', 'parque', 'calle', 'avenida', 'av', 'pasaje', 'comuna', 'ciudad', 'barrio',
    'poblacion', 'población', 'puente', 'villa', 'sector', 'cerro', 'camino', 'ruta',
    'esquina', 'condominio', 'doña', 'don',
]);

const HEALTH_LOCATION_HEADS = new Set([
    'hospital', 'clinica', 'clínica', 'cesfam', 'consultorio', 'urgencia', 'urgencias',
]);

const CONNECTORS = new Set(['de', 'del', 'la', 'las', 'los']);

function normalize(value) {
    return value
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();
}

function tokenize(text) {
    const tokens = [];
    const regex = /[\p{L}'-]+/gu;
    let match;
    while ((match = regex.exec(text)) !== null) {
        tokens.push({
            value: match[0],
            normalized: normalize(match[0]),
            start: match.index,
            end: match.index + match[0].length,
        });
    }
    return tokens;
}

function isCapitalized(token) {
    return /^[A-ZÁÉÍÓÚÑ]/u.test(token.value);
}

function selectNonOverlapping(candidates) {
    const sorted = [...candidates].sort((a, b) => {
        if (a.start !== b.start) return a.start - b.start;
        const lenA = a.end - a.start;
        const lenB = b.end - b.start;
        if (lenA !== lenB) return lenB - lenA;
        return (b.score || 0) - (a.score || 0);
    });

    const selected = [];
    for (const candidate of sorted) {
        const overlaps = selected.some((current) => !(candidate.end <= current.start || candidate.start >= current.end));
        if (!overlaps) selected.push(candidate);
    }
    return selected.sort((a, b) => a.start - b.start);
}

export class LightweightNERModel {
    detect(text) {
        if (typeof text !== 'string' || !text.trim()) return [];
        const tokens = tokenize(text);
        const candidates = [
            ...this.detectHealthLocations(text, tokens),
            ...this.detectLocations(text, tokens),
            ...this.detectPersons(text, tokens),
        ];
        return selectNonOverlapping(candidates);
    }

    detectHealthLocations(text, tokens) {
        return this.detectAnchoredLocations(text, tokens, HEALTH_LOCATION_HEADS, 'HEALTH_LOCATION', 0.95);
    }

    detectLocations(text, tokens) {
        return this.detectAnchoredLocations(text, tokens, LOCATION_HEADS, 'LOCATION', 0.88);
    }

    detectAnchoredLocations(text, tokens, heads, type, score) {
        const entities = [];
        for (let i = 0; i < tokens.length; i += 1) {
            const token = tokens[i];
            if (!heads.has(token.normalized)) continue;

            let endTokenIndex = i;
            for (let j = i + 1; j < tokens.length; j += 1) {
                const next = tokens[j];
                const isConn = CONNECTORS.has(next.normalized);
                if (isConn) {
                    endTokenIndex = j;
                    continue;
                }
                if (isCapitalized(next)) {
                    endTokenIndex = j;
                    continue;
                }
                break;
            }

            if (endTokenIndex <= i) continue;
            const start = token.start;
            let end = tokens[endTokenIndex].end;

            // Capture trailing street number (e.g., "Doña Javiera 982")
            const afterText = text.slice(end);
            const numberMatch = afterText.match(/^\s+\d{1,5}\b/);
            if (numberMatch) {
                end += numberMatch[0].length;
            }

            entities.push({
                type,
                start,
                end,
                text: text.slice(start, end),
                score,
            });
        }
        return entities;
    }

    detectPersons(text, tokens) {
        const entities = [];
        for (let i = 0; i < tokens.length; i += 1) {
            const token = tokens[i];
            if (!isCapitalized(token) || PERSON_STOP_WORDS.has(token.value)) continue;

            let endTokenIndex = i;
            for (let j = i + 1; j < tokens.length && j <= i + 2; j += 1) {
                const next = tokens[j];
                if (!isCapitalized(next) || PERSON_STOP_WORDS.has(next.value)) break;
                endTokenIndex = j;
            }

            const beforeWindow = tokens.slice(Math.max(0, i - 3), i);
            const afterWindow = tokens.slice(endTokenIndex + 1, Math.min(tokens.length, endTokenIndex + 4));
            const hasContextBefore = beforeWindow.some((ctx) => PERSON_CONTEXT_WORDS.has(ctx.normalized));
            const hasContextAfter = afterWindow.some((ctx) => PERSON_CONTEXT_WORDS.has(ctx.normalized));
            const hasContext = hasContextBefore || hasContextAfter;
            const startsSentence = i === 0 || /[.!?]\s*$/u.test(text.slice(Math.max(0, token.start - 3), token.start));
            const score = hasContext ? 0.9 : (startsSentence ? 0.65 : 0.72);

            if (score < 0.65) continue;

            const start = token.start;
            const end = tokens[endTokenIndex].end;
            entities.push({
                type: 'PERSON',
                start,
                end,
                text: text.slice(start, end),
                score,
            });
        }
        return entities;
    }
}

export const defaultLightweightNERModel = new LightweightNERModel();
