"use client";

import { useTheme } from '@/theme/ThemeContext';

export default function ThemeToggle({ className = '' }) {
    const { theme, setTheme } = useTheme();

    const modes = [
        { key: 'light', icon: '☀️' },
        { key: 'system', icon: '💻' },
        { key: 'dark', icon: '🌙' },
    ];

    return (
        <div className={`flex items-center rounded-full overflow-hidden border border-fg/8 backdrop-blur-md text-xs font-medium ${className}`}>
            {modes.map((m) => (
                <button
                    key={m.key}
                    onClick={() => setTheme(m.key)}
                    className={`px-2 py-1.5 transition-colors ${
                        theme === m.key
                            ? 'bg-fg/15 text-fg'
                            : 'text-fg-secondary hover:text-fg'
                    }`}
                    title={m.key}
                >
                    {m.icon}
                </button>
            ))}
        </div>
    );
}
