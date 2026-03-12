export const USER_CONTEXTS = [
    {
        id: 'orlando',
        name: 'Orlando Bustos',
        summary: 'Hombre, 46 años, viudo',
        detail: 'Orlando Bustos, hombre de 46 años, viudo. Su esposa murió hace 5 meses tras un cancer fulminante en tan solo 1 mes y se quedó solo con sus hijos de 5 y 8 años. Siente culpa por no poder estar emocionalmente presente para ellos.',
        country: 'Chile',
        emoji: '👨‍👧‍👦'
    },
    {
        id: 'mary',
        name: 'Mary',
        summary: 'Perdió a su hermano, padre enfermo',
        detail: 'Mary, mujer de 32 años. Su hermano murió en un accidente de moto hace 3 meses y su padre está muy enfermo. Siente que debe ser fuerte para su familia pero está agotada emocionalmente.',
        country: 'México',
        emoji: '👩'
    },
    {
        id: 'rodrigo',
        name: 'Rodrigo',
        summary: 'Joven, perdió a su mejor amigo',
        detail: 'Rodrigo, hombre de 22 años. Su mejor amigo falleció por suicidio hace 2 meses. Siente culpa por no haber notado señales y tiene dificultad para hablar del tema con su entorno.',
        country: 'Argentina',
        emoji: '🧑'
    },
    {
        id: 'carmen',
        name: 'Carmen',
        summary: 'Abuela, perdió a su esposo de 50 años',
        detail: 'Carmen, mujer de 73 años. Su esposo de 50 años de matrimonio falleció hace 8 meses. Se siente completamente perdida sin él y tiene miedo de la soledad.',
        country: 'España',
        emoji: '👵'
    },
    {
        id: 'custom',
        name: 'Sin contexto',
        summary: 'Comenzar sin perfil predefinido',
        detail: '',
        country: '',
        emoji: '💬'
    }
];

export async function detectCountry() {
    try {
        const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
        if (!res.ok) throw new Error('Geo API failed');
        const data = await res.json();
        return data.country_name || fallbackFromLocale();
    } catch {
        return fallbackFromLocale();
    }
}

function fallbackFromLocale() {
    try {
        const locale = navigator.language || '';
        const regionMap = {
            'es-CL': 'Chile', 'es-MX': 'México', 'es-AR': 'Argentina',
            'es-CO': 'Colombia', 'es-PE': 'Perú', 'es-ES': 'España',
            'es-VE': 'Venezuela', 'es-EC': 'Ecuador', 'es-UY': 'Uruguay',
            'pt-BR': 'Brasil', 'en-US': 'Estados Unidos', 'en-GB': 'Reino Unido'
        };
        return regionMap[locale] || 'Desconocido';
    } catch {
        return 'Desconocido';
    }
}
