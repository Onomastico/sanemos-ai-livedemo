"use client";

import { useI18n } from '@/i18n/I18nContext';

export default function LanguageToggle({ className = '' }) {
    const { locale, setLocale } = useI18n();

    return (
        <div className={`flex items-center rounded-full overflow-hidden border border-fg/8 backdrop-blur-md text-xs font-medium ${className}`}>
            <button
                onClick={() => setLocale('es')}
                className={`px-2.5 py-1.5 transition-colors ${
                    locale === 'es'
                        ? 'bg-fg/15 text-fg'
                        : 'text-fg-secondary hover:text-fg'
                }`}
            >
                ES
            </button>
            <button
                onClick={() => setLocale('en')}
                className={`px-2.5 py-1.5 transition-colors ${
                    locale === 'en'
                        ? 'bg-fg/15 text-fg'
                        : 'text-fg-secondary hover:text-fg'
                }`}
            >
                EN
            </button>
        </div>
    );
}
