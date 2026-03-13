/**
 * Refined PII Scrubber for Sanemos Live Demo
 * Uses regex patterns + lightweight NER model to detect and mask:
 * - Contact info (emails, phones, URLs, social handles)
 * - Dates (milestone dates in ES/EN)
 * - Addresses (Chilean/LatAm street patterns)
 * - Person names (context-aware via grief/family keywords)
 * - Health locations (hospitals, clinics)
 * - General locations (plazas, streets, neighborhoods)
 *
 * Tags are numbered and stable across calls within a session
 * (e.g., [PERSONA_VINCULADA_1], [UBICACION_SALUD_1]).
 */

import { defaultLightweightNERModel } from '@/lib/lightweightNerModel';

const PERSON_TAG = 'PERSONA_VINCULADA';
const LOCATION_TAG = 'UBICACION';
const HEALTH_LOCATION_TAG = 'UBICACION_SALUD';
const DATE_TAG = 'FECHA_HITO';
const CONTACT_TAG = 'DATOS_CONTACTO';

const CONTACT_PATTERNS = [
    /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    /\+?\d[\d\s().-]{7,}\d/g,
    /\b(?:https?:\/\/|www\.)\S+\b/gi,
    /\b(?:@|tg:|wa:)[\w.-]{3,}\b/gi,
];

const DATE_PATTERNS = [
    /\b\d{1,2}[\/.-]\d{1,2}([\/.-]\d{2,4})?\b/g,
    /\b\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(\s+de\s+\d{4}|\s+del?\s+\d{4})?\b/gi,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(,\s*\d{4})?\b/gi,
];

const ADDRESS_PATTERNS = [
    /\b(?:calle|avenida|av\.?|pasaje|psje\.?|doña|don|villa|población|poblacion|cerro|camino)\s+[A-ZÁÉÍÓÚÑa-záéíóúñ][A-ZÁÉÍÓÚÑa-záéíóúñ\s]{1,40}\s+\d{1,5}\b/gi,
];

// --- Internal helpers ---

function makeTag(base, counter) {
    return `[${base}_${counter}]`;
}

function shouldSkipEntity(value) {
    return !value || value.includes('[') || value.includes(']');
}

function parseCounter(tag, base) {
    const regex = new RegExp(`^\\[${base}_(\\d+)\\]$`);
    const match = tag.match(regex);
    if (!match) return 0;
    return Number.parseInt(match[1], 10) || 0;
}

function normalizeOriginal(value) {
    return String(value || '').trim();
}

function buildState(existingMappings = []) {
    const counters = {};
    const byTypeOriginal = new Map();

    for (const mapping of existingMappings) {
        if (!mapping?.tag || !mapping?.type || !mapping?.original) continue;
        const normalizedOriginal = normalizeOriginal(mapping.original);
        const key = `${mapping.type}:${normalizedOriginal}`;
        byTypeOriginal.set(key, mapping.tag);

        const current = counters[mapping.type] || 0;
        counters[mapping.type] = Math.max(current, parseCounter(mapping.tag, mapping.type));
    }

    return { counters, byTypeOriginal };
}

function addOrReuseMapping(base, original, state, pendingMappings) {
    const normalizedOriginal = normalizeOriginal(original);
    const key = `${base}:${normalizedOriginal}`;
    const existingTag = state.byTypeOriginal.get(key);

    if (existingTag) {
        return existingTag;
    }

    const count = (state.counters[base] || 0) + 1;
    state.counters[base] = count;
    const tag = makeTag(base, count);
    state.byTypeOriginal.set(key, tag);
    pendingMappings.push({ tag, original: normalizedOriginal, type: base });
    return tag;
}

function dedupeMappings(mappings) {
    const seen = new Set();
    return mappings.filter((mapping) => {
        if (!mapping?.tag || !mapping?.original || !mapping?.type) return false;
        const key = `${mapping.type}:${mapping.tag}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function collectRegexMatches(text, patterns, baseTag) {
    const matches = [];
    for (const pattern of patterns) {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;
        while ((match = regex.exec(text)) !== null) {
            const value = match[0]?.trim();
            if (!value || shouldSkipEntity(value)) continue;
            matches.push({
                start: match.index,
                end: match.index + match[0].length,
                value,
                type: baseTag,
                score: 1,
            });
        }
    }
    return matches;
}

function mapEntityType(entityType) {
    if (entityType === 'PERSON') return PERSON_TAG;
    if (entityType === 'HEALTH_LOCATION') return HEALTH_LOCATION_TAG;
    if (entityType === 'LOCATION') return LOCATION_TAG;
    return null;
}

function collectModelMatches(text, model) {
    const entities = model.detect(text);
    const matches = [];

    for (const entity of entities) {
        const mappedType = mapEntityType(entity?.type);
        if (!mappedType) continue;
        const value = entity.text?.trim();
        if (!value || shouldSkipEntity(value)) continue;
        matches.push({
            start: entity.start,
            end: entity.end,
            value,
            type: mappedType,
            score: entity.score || 0.8,
        });
    }

    return matches;
}

function selectMatches(matches) {
    const sorted = [...matches].sort((a, b) => {
        if (a.start !== b.start) return a.start - b.start;
        const lenA = a.end - a.start;
        const lenB = b.end - b.start;
        if (lenA !== lenB) return lenB - lenA;
        return (b.score || 0) - (a.score || 0);
    });

    const selected = [];
    for (const match of sorted) {
        const overlaps = selected.some((current) => !(match.end <= current.start || match.start >= current.end));
        if (!overlaps) selected.push(match);
    }

    return selected.sort((a, b) => a.start - b.start);
}

function applyMatches(text, matches, state, pendingMappings) {
    if (matches.length === 0) return text;

    let cursor = 0;
    let output = '';

    for (const match of matches) {
        output += text.slice(cursor, match.start);
        const tag = addOrReuseMapping(match.type, match.value, state, pendingMappings);
        output += tag;
        cursor = match.end;
    }

    output += text.slice(cursor);
    return output;
}

// --- Session-level mapping state (persists across calls within a page session) ---
let sessionMappings = [];

/**
 * Reset session mappings (call on new session/agent switch)
 */
export function resetPIIMappings() {
    sessionMappings = [];
}

/**
 * Get current session mappings (for debugging or export)
 */
export function getPIIMappings() {
    return [...sessionMappings];
}

/**
 * Core scrub function with full options.
 * Returns { text, mappings } where mappings are new mappings from this call.
 */
export function scrubPIIText(input, options = {}) {
    if (typeof input !== 'string' || input.length === 0) {
        return { text: input, mappings: [] };
    }

    const entityModel = options.entityModel || defaultLightweightNERModel;
    const existingMappings = Array.isArray(options.existingMappings)
        ? options.existingMappings
        : sessionMappings;
    const state = buildState(existingMappings);
    const pendingMappings = [];

    const regexMatches = [
        ...collectRegexMatches(input, CONTACT_PATTERNS, CONTACT_TAG),
        ...collectRegexMatches(input, DATE_PATTERNS, DATE_TAG),
        ...collectRegexMatches(input, ADDRESS_PATTERNS, LOCATION_TAG),
    ];

    const modelMatches = collectModelMatches(input, entityModel);
    const selectedMatches = selectMatches([...regexMatches, ...modelMatches]);
    const text = applyMatches(input, selectedMatches, state, pendingMappings);

    // Accumulate into session mappings
    if (pendingMappings.length > 0) {
        sessionMappings = dedupeMappings([...sessionMappings, ...pendingMappings]);
    }

    return {
        text,
        mappings: dedupeMappings(pendingMappings),
    };
}

function isPIIEnabled() {
    try {
        const raw = localStorage.getItem('sanemos_settings');
        if (raw) {
            const s = JSON.parse(raw);
            return s.piiScrubbing !== false;
        }
    } catch {}
    return true; // default on
}

/**
 * Backward-compatible drop-in replacement for the old maskPII().
 * Used in GeminiLiveSession and SessionSummary.
 */
export function maskPII(text) {
    if (!text) return text;
    if (!isPIIEnabled()) return text;
    const { text: scrubbed } = scrubPIIText(text);
    return scrubbed;
}

/**
 * Rehydrate masked text back to original using stored mappings.
 */
export function rehydrateAIText(maskedText, mappings) {
    const maps = mappings || sessionMappings;
    if (typeof maskedText !== 'string' || !Array.isArray(maps) || maps.length === 0) {
        return maskedText;
    }
    return maps.reduce((acc, item) => {
        if (!item?.tag || !item?.original) return acc;
        return acc.split(item.tag).join(item.original);
    }, maskedText);
}
