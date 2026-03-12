"use client";

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import es from './es.json';
import en from './en.json';

const dictionaries = { es, en };

const I18nContext = createContext(null);

function getDefaultLocale() {
    if (typeof window === 'undefined') return 'en';
    const saved = localStorage.getItem('sanemos_lang');
    if (saved && dictionaries[saved]) return saved;
    return (navigator.language || '').startsWith('es') ? 'es' : 'en';
}

export function I18nProvider({ children }) {
    const [locale, setLocaleState] = useState('en');

    useEffect(() => {
        setLocaleState(getDefaultLocale());
    }, []);

    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);

    const setLocale = useCallback((newLocale) => {
        if (dictionaries[newLocale]) {
            setLocaleState(newLocale);
            localStorage.setItem('sanemos_lang', newLocale);
        }
    }, []);

    const t = useCallback((key, params) => {
        const dict = dictionaries[locale] || dictionaries.en;
        let value = dict[key] || dictionaries.en[key] || key;
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
            });
        }
        return value;
    }, [locale]);

    return (
        <I18nContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error('useI18n must be used within I18nProvider');
    return ctx;
}
