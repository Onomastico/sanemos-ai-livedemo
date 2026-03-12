"use client";

import { useI18n } from '@/i18n/I18nContext';

export default function LanguageToggle({ className = '' }) {
    const { locale, setLocale } = useI18n();

    return (
        <div className={`flex items-center rounded-full overflow-hidden border border-white/10 backdrop-blur-md text-xs font-medium ${className}`}>
            <button
                onClick={() => setLocale('es')}
                className={`px-2.5 py-1.5 transition-colors ${
                    locale === 'es'
                        ? 'bg-white/15 text-white'
                        : 'text-gray-500 hover:text-gray-300'
                }`}
            >
                ES
            </button>
            <button
                onClick={() => setLocale('en')}
                className={`px-2.5 py-1.5 transition-colors ${
                    locale === 'en'
                        ? 'bg-white/15 text-white'
                        : 'text-gray-500 hover:text-gray-300'
                }`}
            >
                EN
            </button>
        </div>
    );
}
