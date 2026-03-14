"use client";

import { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/I18nContext';
import { GoogleGenAI } from '@google/genai';

const PLATFORM_INFO = {
    facebook: { icon: '📘', label: 'Facebook', color: '#1877F2', bg: '#E7F3FF' },
    instagram: { icon: '📸', label: 'Instagram', color: '#E4405F', bg: '#FFEEF2' },
    twitter: { icon: '𝕏', label: 'X / Twitter', color: '#000000', bg: '#F0F0F0' },
};

export default function SocialPostModal({ post, agentColor, apiKey, onClose }) {
    const { t } = useI18n();
    const [copied, setCopied] = useState(false);
    const [generatedImage, setGeneratedImage] = useState(null);
    const [imageLoading, setImageLoading] = useState(false);
    const [imageError, setImageError] = useState(null);
    const defaultPlatform = { icon: '📝', label: t('social.socialNetwork'), color: agentColor, bg: agentColor + '15' };
    const platform = PLATFORM_INFO[post.platform] || defaultPlatform;

    // Generate an image related to the post content
    // Try Imagen 3 first, fallback to Gemini native image generation
    useEffect(() => {
        if (!apiKey || !post.post_text) return;
        let cancelled = false;
        const imagePrompt = `Create a beautiful, emotional, tasteful image for a social media post about: ${post.occasion || 'remembrance'}. The post says: "${post.post_text.slice(0, 200)}". Style: warm, hopeful, suitable for ${post.platform || 'social media'}. No text in the image.`;

        const tryImagen = async (ai) => {
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-fast-generate-001',
                prompt: imagePrompt,
                config: { numberOfImages: 1, safetyFilterLevel: 'BLOCK_LOW_AND_ABOVE', personGeneration: 'ALLOW_ALL' }
            });
            if (response.generatedImages?.[0]?.image?.imageBytes) {
                return `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;
            }
            return null;
        };

        const tryGeminiNative = async (ai) => {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: imagePrompt,
                config: { responseModalities: ['IMAGE', 'TEXT'] }
            });
            const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.mimeType?.startsWith('image/'));
            if (part) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
            return null;
        };

        const generateImage = async () => {
            setImageLoading(true);
            setImageError(null);
            try {
                const ai = new GoogleGenAI({ apiKey });
                // Try Imagen 3 first
                let result = null;
                try {
                    result = await tryImagen(ai);
                } catch (err) {
                    console.warn('Imagen failed, trying Gemini native:', err.message || err);
                }
                // Fallback to Gemini native image generation
                if (!result) {
                    try {
                        result = await tryGeminiNative(ai);
                    } catch (err2) {
                        console.warn('Gemini native image gen failed:', err2.message || err2);
                    }
                }
                if (!cancelled) {
                    if (result) {
                        setGeneratedImage(result);
                    } else {
                        setImageError(true);
                    }
                }
            } catch (err) {
                console.warn('Image generation failed:', err);
                if (!cancelled) setImageError(true);
            } finally {
                if (!cancelled) setImageLoading(false);
            }
        };
        generateImage();
        return () => { cancelled = true; };
    }, [apiKey, post.post_text, post.occasion, post.platform]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(post.post_text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ text: post.post_text });
            } catch (_) {} // User cancelled share
        }
    };

    const canShare = typeof navigator !== 'undefined' && !!navigator.share;

    // Platform-specific preview renderers
    const renderPreview = () => {
        const p = post.platform;

        if (p === 'facebook') {
            return (
                <div className="mx-4 my-3 rounded-lg overflow-hidden border border-fg/10" style={{ background: 'var(--bg)' }}>
                    {/* FB Header */}
                    <div className="flex items-center gap-2.5 px-3 py-2.5">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: platform.color }}>S</div>
                        <div>
                            <p className="text-fg text-xs font-semibold">Sanemos AI</p>
                            <p className="text-fg-secondary text-[10px]">{t('social.justNow') || 'Just now'} · 🌐</p>
                        </div>
                    </div>
                    {/* FB Text */}
                    <div className="px-3 pb-2">
                        <p className="text-fg/90 text-xs leading-relaxed whitespace-pre-wrap line-clamp-4">{post.post_text}</p>
                    </div>
                    {/* FB Image */}
                    {renderImageArea('aspect-[1200/630]')}
                    {/* FB Reactions bar */}
                    <div className="px-3 py-2 border-t border-fg/6 flex items-center justify-between text-fg-secondary text-[10px]">
                        <span>❤️ 👍 {t('social.likesCount') || '12'}</span>
                        <span>{t('social.commentsCount') || '3 comments'}</span>
                    </div>
                </div>
            );
        }

        if (p === 'instagram') {
            return (
                <div className="mx-4 my-3 rounded-lg overflow-hidden border border-fg/10" style={{ background: 'var(--bg)' }}>
                    {/* IG Header */}
                    <div className="flex items-center gap-2.5 px-3 py-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>S</div>
                        <p className="text-fg text-xs font-semibold">sanemos_ai</p>
                    </div>
                    {/* IG Image (square) */}
                    {renderImageArea('aspect-square')}
                    {/* IG Actions */}
                    <div className="px-3 pt-2 flex gap-4 text-fg text-base">
                        <span>♡</span><span>💬</span><span>➤</span>
                    </div>
                    {/* IG Caption */}
                    <div className="px-3 py-2">
                        <p className="text-fg/90 text-[11px] leading-relaxed line-clamp-3">
                            <span className="font-semibold">sanemos_ai</span> {post.post_text.slice(0, 150)}
                        </p>
                    </div>
                </div>
            );
        }

        if (p === 'twitter') {
            return (
                <div className="mx-4 my-3 rounded-xl overflow-hidden border border-fg/10 p-3" style={{ background: 'var(--bg)' }}>
                    {/* X Header */}
                    <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold bg-black">S</div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="text-fg text-xs font-bold">Sanemos AI</span>
                                <span className="text-fg-secondary text-[10px]">@sanemos_ai · {t('social.justNow') || 'now'}</span>
                            </div>
                            <p className="text-fg/90 text-xs leading-relaxed whitespace-pre-wrap mt-1 line-clamp-4">{post.post_text.slice(0, 280)}</p>
                            {/* X Image */}
                            <div className="mt-2">
                                {renderImageArea('aspect-[16/9] rounded-xl')}
                            </div>
                            {/* X Actions */}
                            <div className="flex items-center justify-between mt-2 text-fg-secondary text-[10px] pr-8">
                                <span>💬 3</span><span>🔁 5</span><span>♡ 24</span><span>📊 1.2K</span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // General — simple card with image
        return (
            <div className="mx-4 my-3">
                {renderImageArea('aspect-[16/9] rounded-xl')}
                <div className="mt-3">
                    <p className="text-fg/90 text-sm leading-relaxed whitespace-pre-wrap">{post.post_text}</p>
                </div>
            </div>
        );
    };

    const renderImageArea = (aspectClass) => (
        <div className={`w-full ${aspectClass} overflow-hidden relative`} style={{ backgroundColor: platform.bg || agentColor + '10' }}>
            {generatedImage ? (
                <img src={generatedImage} alt="" className="w-full h-full object-cover" />
            ) : imageLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: agentColor + '30', borderTopColor: agentColor }} />
                    <span className="text-fg-secondary text-[10px]">{t('social.generatingImage') || 'Generating image...'}</span>
                </div>
            ) : imageError ? (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center px-4">
                        <span className="text-3xl opacity-40">🖼️</span>
                        <p className="text-fg-secondary text-[10px] mt-1">{t('social.imageUnavailable') || 'Image unavailable'}</p>
                    </div>
                </div>
            ) : null}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-(--overlay) backdrop-blur-sm" />

            {/* Card */}
            <div
                className="relative w-full max-w-md max-h-[90vh] rounded-2xl border border-fg/8 shadow-2xl overflow-hidden flex flex-col"
                style={{ background: 'var(--surface-alpha)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-fg/6">
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

                {/* Platform Preview */}
                <div className="flex-1 overflow-y-auto">
                    {renderPreview()}
                </div>

                {/* Actions */}
                <div className="px-5 py-3 border-t border-fg/6 flex gap-3">
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
                    {canShare && (
                        <button
                            onClick={handleShare}
                            className="flex-1 py-2.5 rounded-full text-sm font-medium transition-all"
                            style={{
                                backgroundColor: agentColor + '15',
                                color: agentColor,
                                border: `1px solid ${agentColor}40`
                            }}
                        >
                            {t('social.share') || 'Share'}
                        </button>
                    )}
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
