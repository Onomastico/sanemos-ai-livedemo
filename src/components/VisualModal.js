"use client";

import { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/I18nContext';
import { GoogleGenAI } from '@google/genai';

const TYPE_INFO = {
    diagram:       { icon: '📊', labelKey: 'visual.typeDiagram' },
    illustration:  { icon: '🎨', labelKey: 'visual.typeIllustration' },
    calming_image: { icon: '🌿', labelKey: 'visual.typeCalmingImage' },
};

export default function VisualModal({ visual, agentColor, apiKey, onClose }) {
    const { t } = useI18n();
    const [generatedImage, setGeneratedImage] = useState(null);
    const [imageLoading, setImageLoading] = useState(false);
    const [imageError, setImageError] = useState(null);

    const typeInfo = TYPE_INFO[visual.visual_type] || TYPE_INFO.illustration;

    useEffect(() => {
        if (!apiKey || !visual.description) return;
        let cancelled = false;

        const imagePrompt = visual.visual_type === 'calming_image'
            ? `Create a beautiful, serene, calming image for mindfulness and emotional grounding: ${visual.description}. Style: peaceful, warm colors, no text in the image, suitable for meditation or relaxation.`
            : `Create a clear, warm, educational illustration about grief support: ${visual.description}. Style: informative but gentle, soft colors, easy to understand, no harsh clinical look, no text in the image.`;

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
                let result = null;
                try {
                    result = await tryImagen(ai);
                } catch (err) {
                    console.warn('Imagen failed, trying Gemini native:', err.message || err);
                }
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
    }, [apiKey, visual.description, visual.visual_type]);

    const handleDownload = () => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `sanemos-${visual.visual_type}-${Date.now()}.png`;
        link.click();
    };

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
                        <span className="text-xl">{typeInfo.icon}</span>
                        <div>
                            <h3 className="text-fg text-sm font-semibold">{visual.title || t(typeInfo.labelKey)}</h3>
                            <p className="text-fg-secondary text-[11px]">{t(typeInfo.labelKey)}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-fg-secondary hover:text-fg transition-colors text-lg leading-none px-1"
                    >
                        &times;
                    </button>
                </div>

                {/* Image Area */}
                <div className="flex-1 overflow-y-auto">
                    <div className="mx-4 my-3">
                        <div className="w-full aspect-square rounded-xl overflow-hidden relative" style={{ backgroundColor: agentColor + '10' }}>
                            {generatedImage ? (
                                <img src={generatedImage} alt={visual.title || ''} className="w-full h-full object-cover" />
                            ) : imageLoading ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                    <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: agentColor + '30', borderTopColor: agentColor }} />
                                    <span className="text-fg-secondary text-[10px]">{t('visual.generatingImage')}</span>
                                </div>
                            ) : imageError ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center px-4">
                                        <span className="text-3xl opacity-40">🖼️</span>
                                        <p className="text-fg-secondary text-[10px] mt-1">{t('visual.imageUnavailable')}</p>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                        {/* Description */}
                        {visual.description && (
                            <p className="text-fg/80 text-xs leading-relaxed mt-3 px-1">{visual.description}</p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="px-5 py-3 border-t border-fg/6 flex gap-3">
                    {generatedImage && (
                        <button
                            onClick={handleDownload}
                            className="flex-1 py-2.5 rounded-full text-sm font-medium transition-all"
                            style={{
                                backgroundColor: agentColor + '15',
                                color: agentColor,
                                border: `1px solid ${agentColor}40`
                            }}
                        >
                            {t('visual.download')}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-full text-sm font-medium text-fg-secondary bg-fg/5 border border-fg/8 hover:bg-fg/10 transition-all"
                    >
                        {t('visual.close')}
                    </button>
                </div>
            </div>
        </div>
    );
}
