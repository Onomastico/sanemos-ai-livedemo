"use client";

import { useState } from 'react';

const PLATFORM_INFO = {
    facebook: { icon: '📘', label: 'Facebook' },
    instagram: { icon: '📸', label: 'Instagram' },
    twitter: { icon: '𝕏', label: 'X / Twitter' },
    general: { icon: '📝', label: 'Red Social' }
};

export default function SocialPostModal({ post, agentColor, onClose }) {
    const [copied, setCopied] = useState(false);
    const platform = PLATFORM_INFO[post.platform] || PLATFORM_INFO.general;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(post.post_text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Card */}
            <div
                className="relative w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
                style={{ background: 'rgba(20, 20, 25, 0.95)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                        <span className="text-xl">{platform.icon}</span>
                        <div>
                            <h3 className="text-white text-sm font-semibold">{platform.label}</h3>
                            {post.occasion && (
                                <p className="text-gray-500 text-[11px] capitalize">{post.occasion}</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-white transition-colors text-lg leading-none px-1"
                    >
                        &times;
                    </button>
                </div>

                {/* Post text */}
                <div className="px-5 py-4 max-h-[50vh] overflow-y-auto">
                    <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                        {post.post_text}
                    </p>
                </div>

                {/* Actions */}
                <div className="px-5 py-4 border-t border-white/[0.06] flex gap-3">
                    <button
                        onClick={handleCopy}
                        className="flex-1 py-2.5 rounded-full text-sm font-medium transition-all"
                        style={{
                            backgroundColor: copied ? agentColor + '30' : agentColor + '15',
                            color: agentColor,
                            border: `1px solid ${agentColor}40`
                        }}
                    >
                        {copied ? 'Copiado!' : 'Copiar texto'}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-full text-sm font-medium text-gray-400 bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
