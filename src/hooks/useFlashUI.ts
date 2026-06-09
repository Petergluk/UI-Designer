import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Artifact, Session, ComponentVariation } from '../types';
import { INITIAL_PLACEHOLDERS } from '../constants';
import { extractJsonArray } from '../utils';
import { PROMPTS } from '../prompts';

export type Viewport = 'desktop' | 'tablet' | 'mobile';
export type DrawerMode = 'code' | 'variations' | 'settings' | 'history' | 'gallery' | null;

export function useFlashUI() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [currentSessionIndex, setCurrentSessionIndex] = useState<number>(-1);
    const [focusedArtifactIndex, setFocusedArtifactIndex] = useState<number | null>(null);
    const [viewport, setViewport] = useState<Viewport>('desktop');
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    
    // Preferences
    const [savedStyles, setSavedStyles] = useState<string[]>(['Glassmorphism', 'Brutalist Grid']);
    const [activeStyle, setActiveStyle] = useState<string | null>(null);
    const [selectedStyles, setSelectedStyles] = useState<string[]>(['minimalist', 'glass', 'brutalist']);
    const [aiModel, setAiModel] = useState<string>('gemini-3.5-flash');
    const [customApiKey, setCustomApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
    
    // Input state
    const [inputValue, setInputValue] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [placeholders, setPlaceholders] = useState<string[]>(INITIAL_PLACEHOLDERS);
    const [images, setImages] = useState<{base64: string; mimeType: string; dataUrl: string}[]>([]);
    
    // UI state
    const [drawerState, setDrawerState] = useState<{
        isOpen: boolean;
        mode: DrawerMode;
        title: string;
        data: any; 
    }>({ isOpen: false, mode: null, title: '', data: null });
    const [componentVariations, setComponentVariations] = useState<ComponentVariation[]>([]);

    const inputRef = useRef<HTMLInputElement>(null);
    const gridScrollRef = useRef<HTMLDivElement>(null);

    // Initial load: fetch dynamic placeholders
    useEffect(() => {
        const fetchDynamicPlaceholders = async () => {
            try {
                const apiKey = customApiKey || process.env.API_KEY;
                if (!apiKey) return;
                const ai = new GoogleGenAI({ apiKey });
                const response = await ai.models.generateContent({
                    model: aiModel,
                    contents: { role: 'user', parts: [{ text: PROMPTS.dynamicPlaceholders }] }
                });
                const text = response.text || '[]';
                const newPlaceholders = extractJsonArray(text);
                if (newPlaceholders && newPlaceholders.length > 0) {
                    const shuffled = newPlaceholders.sort(() => 0.5 - Math.random()).slice(0, 10);
                    setPlaceholders(prev => [...prev, ...shuffled]);
                }
            } catch (e) {
                console.warn("Silently failed to fetch dynamic placeholders", e);
            }
        };
        setTimeout(fetchDynamicPlaceholders, 1000);
    }, []);

    // Toggle placeholders
    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex(prev => (prev + 1) % placeholders.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [placeholders.length]);

    // Fullscreen effect
    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Focus scroll to top on mobile
    useEffect(() => {
        if (focusedArtifactIndex !== null && window.innerWidth <= 1024) {
            if (gridScrollRef.current) {
                gridScrollRef.current.scrollTop = 0;
            }
            window.scrollTo(0, 0);
        }
    }, [focusedArtifactIndex]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(event.target.value);
    };

    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else if (document.exitFullscreen) {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.error("Fullscreen toggle failed", err);
        }
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files: File[] = Array.from(event.target.files || []);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImages(prev => [...prev, {
                    base64: (reader.result as string).split(',')[1],
                    mimeType: file.type,
                    dataUrl: reader.result as string
                }]);
            };
            reader.readAsDataURL(file);
        });
        if (event.target) event.target.value = '';
    };

    const removeImage = (indexToRemove: number) => {
        setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const handleDeleteArtifact = (sessionIndex: number, artifactId: string) => {
        setSessions(prev => prev.map((s, sIdx) => {
            if (sIdx !== sessionIndex) return s;
            return {
                ...s,
                artifacts: s.artifacts.filter(a => a.id !== artifactId)
            };
        }).filter(s => s.artifacts.length > 0));

        if (sessionIndex === currentSessionIndex && focusedArtifactIndex !== null) {
            setFocusedArtifactIndex(null);
        }
    };

    const toggleStyleSelection = (id: string) => {
        setSelectedStyles(prev => {
            if (prev.includes(id)) {
                if (prev.length === 1) return prev;
                return prev.filter(s => s !== id);
            }
            if (prev.length >= 3) return [...prev.slice(1), id];
            return [...prev, id];
        });
    };

    const handleGenerateVariations = useCallback(async () => {
        const currentSession = sessions[currentSessionIndex];
        if (!currentSession || focusedArtifactIndex === null) return;
        const currentArtifact = currentSession.artifacts[focusedArtifactIndex];

        setIsLoading(true);
        setComponentVariations([]);
        setDrawerState({ isOpen: true, mode: 'variations', title: `Variations for ${currentArtifact.styleName}`, data: currentArtifact.id });

        try {
            const apiKey = customApiKey || process.env.API_KEY;
            if (!apiKey) throw new Error("API_KEY is not configured.");
            const ai = new GoogleGenAI({ apiKey });
            const prompt = PROMPTS.generateVariations(currentSession.prompt);
            const response = await ai.models.generateContent({
                model: aiModel,
                contents: [{ parts: [{ text: prompt }], role: 'user' }],
            });

            const responseText = response.text || '';
            const variations = extractJsonArray(responseText);
            if (variations) {
                setComponentVariations(variations);
            } else {
                console.error("No JSON array found in variations output");
            }
        } catch (e: any) {
            console.error("Error generating variations:", e);
        } finally {
            setIsLoading(false);
        }
    }, [sessions, currentSessionIndex, focusedArtifactIndex, aiModel, customApiKey]);

    const applyVariation = (html: string) => {
        if (focusedArtifactIndex === null) return;
        setSessions(prev => prev.map((sess, i) => 
            i === currentSessionIndex ? {
                ...sess,
                artifacts: sess.artifacts.map((art, j) => 
                    j === focusedArtifactIndex ? { ...art, html, status: 'complete' } : art
                )
            } : sess
        ));
        setDrawerState(s => ({ ...s, isOpen: false }));
    };

    const handleShowCode = () => {
        const currentSession = sessions[currentSessionIndex];
        if (currentSession && focusedArtifactIndex !== null) {
            const artifact = currentSession.artifacts[focusedArtifactIndex];
            setDrawerState({ isOpen: true, mode: 'code', title: `Source - ${artifact.styleName}`, data: artifact.html });
        }
    };

    const handleGenerateDesignMd = async () => {
        const currentSession = sessions[currentSessionIndex];
        if (!currentSession || focusedArtifactIndex === null) return;
        const artifact = currentSession.artifacts[focusedArtifactIndex];
        
        setDrawerState({ isOpen: true, mode: 'design-md', title: 'DESIGN.md for Stitch', data: 'Analyzing design and generating DESIGN.md instructions...' });
        
        try {
            const apiKey = customApiKey || process.env.API_KEY;
            if (!apiKey) {
                setDrawerState(s => ({...s, data: 'API Key not configured. Please add your Gemini API Key in Settings.'}));
                return;
            }
            
            const ai = new GoogleGenAI({ apiKey });
            const prompt = PROMPTS.generateDesignMd(artifact.html);
            const response = await ai.models.generateContent({
                model: aiModel,
                contents: [{ parts: [{ text: prompt }], role: 'user' }],
            });
    
            let mdText = response.text || 'Failed to generate DESIGN.md';
            mdText = mdText.replace(/^```(markdown)?\n?/, '').replace(/\n```$/, '');
            setDrawerState(s => ({ ...s, data: mdText }));
        } catch (e: any) {
            console.error("Error generating DESIGN.md:", e);
            setDrawerState(s => ({ ...s, data: `Error: ${e.message}` }));
        }
    };

    return {
        sessions, setSessions,
        currentSessionIndex, setCurrentSessionIndex,
        focusedArtifactIndex, setFocusedArtifactIndex,
        viewport, setViewport,
        isFullscreen, setIsFullscreen,
        savedStyles, setSavedStyles,
        activeStyle, setActiveStyle,
        selectedStyles, setSelectedStyles,
        aiModel, setAiModel,
        customApiKey, setCustomApiKey,
        inputValue, setInputValue,
        isLoading, setIsLoading,
        placeholderIndex, setPlaceholderIndex,
        placeholders, setPlaceholders,
        images, setImages,
        drawerState, setDrawerState,
        componentVariations, setComponentVariations,
        inputRef,
        gridScrollRef,
        handleInputChange,
        toggleFullscreen,
        handleImageUpload,
        removeImage,
        handleDeleteArtifact,
        toggleStyleSelection,
        handleGenerateVariations,
        applyVariation,
        handleShowCode,
        handleGenerateDesignMd
    };
}
