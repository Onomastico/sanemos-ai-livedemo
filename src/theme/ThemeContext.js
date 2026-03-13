"use client";

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

function getSystemTheme() {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved) {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(resolved);
}

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState('dark');
    const [resolvedTheme, setResolvedTheme] = useState('dark');

    useEffect(() => {
        const saved = localStorage.getItem('sanemos_theme') || 'dark';
        setThemeState(saved);
        const resolved = saved === 'system' ? getSystemTheme() : saved;
        setResolvedTheme(resolved);
        applyTheme(resolved);
    }, []);

    useEffect(() => {
        if (theme !== 'system') return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => {
            const resolved = e.matches ? 'dark' : 'light';
            setResolvedTheme(resolved);
            applyTheme(resolved);
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [theme]);

    const setTheme = useCallback((newTheme) => {
        setThemeState(newTheme);
        localStorage.setItem('sanemos_theme', newTheme);
        const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;
        setResolvedTheme(resolved);
        applyTheme(resolved);
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
