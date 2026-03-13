"use client";

import { useState } from 'react';
import { useI18n } from '@/i18n/I18nContext';

const PLATFORM_INFO = {
    facebook: { icon: '📘', label: 'Facebook' },
    instagram: { icon: '📸', label: 'Instagram' },
    twitter: { icon: '𝕏', label: 'X / Twitter' },
};

export default function SocialPostModal({ post, agentColor, onClose }) {
    const { t } = useI18n();
    const [copied, setCopied] = useState(false);
    const defaultPlatform = { icon: '📝', label: t('social.socialNetwork') };
    const platform = PLATFORM_INFO[post.platform] || defaultPlatform;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(post.post_text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-(--overlay) backdrop-blur-sm" />

            {/* Card */}
            <div
                className="relative w-full max-w-md rounded-2xl border border-fg/8 shadow-2xl overflow-hidden"
                style={{ background: 'var(--surface-alpha)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-fg/6">
                    <div className="flex items-center gap-2.5">
                        <span className="text-xl">{platform.icon}</span>
                        <div>
                            <h3 className="text-fg text-sm font-semibold">{platform.label}</h3>
                            {post.occasion && (
                                <p className="text-fg-secondary text-[11px] capitalize">{post.occasion}</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-fg-secondary hover:text-fg transition-colors text-lg leading-none px-1"
                    >
                        &times;
                    </button>
                </div>

                {/* Post text */}
                <div className="px-5 py-4 max-h-[50vh] overflow-y-auto">
                    <p className="text-fg/90 text-sm leading-relaxed whitespace-pre-wrap">
                        {post.post_text}
                    </p>
                </div>

                {/* Actions */}
                <div className="px-5 py-4 border-t border-fg/6 flex gap-3">
                    <button
                        onClick={handleCopy}
                        className="flex-1 py-2.5 rounded-full text-sm font-medium transition-all"
                        style={{
                            backgroundColor: copied ? agentColor + '30' : agentColor + '15',
                            color: agentColor,
                            border: `1px solid ${agentColor}40`
                        }}
                    >
                        {copied ? t('social.copied') : t('social.copyText')}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-full text-sm font-medium text-fg-secondary bg-fg/5 border border-fg/8 hover:bg-fg/10 transition-all"
                    >
                        {t('social.close')}
                    </button>
                </div>
            </div>
        </div>
    );
}
