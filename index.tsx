/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

//Vibe coded by ammaar@google.com

import { GoogleGenAI } from '@google/genai';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';

import { Artifact, Session, ComponentVariation } from './types';
import { INITIAL_PLACEHOLDERS } from './constants';
import { generateId, extractJsonArray } from './utils';

import DottedGlowBackground from './components/DottedGlowBackground';
import ArtifactCard from './components/ArtifactCard';
import SideDrawer from './components/SideDrawer';
import { 
    ThinkingIcon, 
    CodeIcon, 
    SparklesIcon, 
    ArrowLeftIcon, 
    ArrowRightIcon, 
    ArrowUpIcon, 
    GridIcon,
    SettingsIcon,
    DesktopIcon,
    TabletIcon,
    MobileIcon,
    FullscreenIcon,
    MinimizeIcon,
    CopyIcon,
    DownloadIcon,
    HistoryIcon,
    PlusIcon
} from './components/Icons';

type Viewport = 'desktop' | 'tablet' | 'mobile';

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState<number>(-1);
  const [focusedArtifactIndex, setFocusedArtifactIndex] = useState<number | null>(null);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [savedStyles, setSavedStyles] = useState<string[]>(['Glassmorphism', 'Brutalist Grid']);
  const [activeStyle, setActiveStyle] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string>('gemini-3.5-flash');
  const [customApiKey, setCustomApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholders, setPlaceholders] = useState<string[]>(INITIAL_PLACEHOLDERS);
  
  const [drawerState, setDrawerState] = useState<{
      isOpen: boolean;
      mode: 'code' | 'variations' | 'settings' | 'history' | null;
      title: string;
      data: any; 
  }>({ isOpen: false, mode: null, title: '', data: null });

  const [componentVariations, setComponentVariations] = useState<ComponentVariation[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      inputRef.current?.focus();
  }, []);

  // Fix for mobile: reset scroll when focusing an item to prevent "overscroll" state
  useEffect(() => {
    if (focusedArtifactIndex !== null && window.innerWidth <= 1024) {
        if (gridScrollRef.current) {
            gridScrollRef.current.scrollTop = 0;
        }
        window.scrollTo(0, 0);
    }
  }, [focusedArtifactIndex]);

  // Cycle placeholders
  useEffect(() => {
      const interval = setInterval(() => {
          setPlaceholderIndex(prev => (prev + 1) % placeholders.length);
      }, 3000);
      return () => clearInterval(interval);
  }, [placeholders.length]);

  // Dynamic placeholder generation on load
  useEffect(() => {
      const fetchDynamicPlaceholders = async () => {
          try {
              const apiKey = customApiKey || process.env.API_KEY;
              if (!apiKey) return;
              const ai = new GoogleGenAI({ apiKey });
              const response = await ai.models.generateContent({
                  model: aiModel,
                  contents: { 
                      role: 'user', 
                      parts: [{ 
                          text: 'Generate 20 creative, short, diverse UI component prompts (e.g. "bioluminescent task list"). Return ONLY a raw JSON array of strings. IP SAFEGUARD: Avoid referencing specific famous artists, movies, or brands.' 
                      }] 
                  }
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

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
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

        const prompt = `
You are a master UI/UX designer. Generate 3 RADICAL CONCEPTUAL VARIATIONS of the following design prompt: "${currentSession.prompt}".

**STRICT IP SAFEGUARD:**
No names of artists. 
Instead, describe the *Physicality* and *Material Logic* of the UI.

**CREATIVE GUIDANCE (Use these as EXAMPLES of how to describe style, but INVENT YOUR OWN):**
1. Example: "Asymmetrical Primary Grid" (Heavy black strokes, rectilinear structure, flat primary pigments, high-contrast white space).
2. Example: "Suspended Kinetic Mobile" (Delicate wire-thin connections, floating organic primary shapes, slow-motion balance, white-void background).
3. Example: "Grainy Risograph Press" (Overprinted translucent inks, dithered grain textures, monochromatic color depth, raw paper substrate).
4. Example: "Volumetric Spectral Fluid" (Generative morphing gradients, soft-focus diffusion, bioluminescent light sources, spectral chromatic aberration).

**YOUR TASK:**
For EACH variation:
- Invent a unique design persona name based on a NEW physical metaphor.
- Rewrite the prompt to fully adopt that metaphor's visual language.
- Generate high-fidelity HTML/CSS.

Return a raw JSON array of exact 3 objects, like this:
[
  { "name": "Persona Name 1", "html": "..." },
  { "name": "Persona Name 2", "html": "..." },
  { "name": "Persona Name 3", "html": "..." }
]
        `.trim();

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
  }, [sessions, currentSessionIndex, focusedArtifactIndex, aiModel]);

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

  const handleSendMessage = useCallback(async (manualPrompt?: string) => {
    const promptToUse = manualPrompt || inputValue;
    const trimmedInput = promptToUse.trim();
    
    if (!trimmedInput || isLoading) return;
    if (!manualPrompt) setInputValue('');

    setIsLoading(true);
    const baseTime = Date.now();
    const sessionId = generateId();

    const placeholderArtifacts: Artifact[] = Array(3).fill(null).map((_, i) => ({
        id: `${sessionId}_${i}`,
        styleName: 'Designing...',
        html: '',
        status: 'streaming',
    }));

    const sessionPrompt = activeStyle ? `${trimmedInput} (Style constraint: ${activeStyle})` : trimmedInput;

    const isIteration = sessions.length > 0;
    const previousSession = isIteration ? sessions[currentSessionIndex] : null;
    const focusedHtml = (previousSession && focusedArtifactIndex !== null) ? previousSession.artifacts[focusedArtifactIndex].html : null;

    const newSession: Session = {
        id: sessionId,
        prompt: sessionPrompt,
        timestamp: baseTime,
        artifacts: placeholderArtifacts
    };

    setSessions(prev => [...prev, newSession]);
    setCurrentSessionIndex(sessions.length); 
    setFocusedArtifactIndex(null); 

    try {
        const apiKey = customApiKey || process.env.API_KEY;
        if (!apiKey) throw new Error("API_KEY is not configured.");
        const ai = new GoogleGenAI({ apiKey });

        let stylePrompt = '';
        if (activeStyle) {
             stylePrompt = `
Generate 3 distinct, highly evocative micro-variations of the aesthetic style "${activeStyle}" for the UI: "${trimmedInput}".
For example, if the aesthetic is "Glassmorphism", the variations could be "Frosted Glassmorphism", "Dark Glassmorphism", "Neon Glassmorphism".

**GOAL:**
Return ONLY a raw JSON array of 3 *NEW*, creative names for these directions based on "${activeStyle}".
        `.trim();
        } else if (isIteration) {
             stylePrompt = `
The user wants to iterate on their previous design with: "${trimmedInput}".
Generate 3 distinct, highly evocative design directions for this updated request.

**STRICT IP SAFEGUARD:**
Never use artist or brand names. Use physical and material metaphors.

**GOAL:**
Return ONLY a raw JSON array of 3 *NEW*, creative names for these directions (e.g. ["Tactile Risograph Press", "Kinetic Silhouette Balance", "Primary Pigment Gridwork"]).
        `.trim();
        } else {
             stylePrompt = `
Generate 3 distinct, highly evocative design directions for: "${trimmedInput}".

**STRICT IP SAFEGUARD:**
Never use artist or brand names. Use physical and material metaphors.

**CREATIVE EXAMPLES (Do not simply copy these, use them as a guide for tone):**
- Example A: "Asymmetrical Rectilinear Blockwork" (Grid-heavy, primary pigments, thick structural strokes, Bauhaus-functionalism vibe).
- Example B: "Grainy Risograph Layering" (Tactile paper texture, overprinted translucent inks, dithered gradients).
- Example C: "Kinetic Wireframe Suspension" (Floating silhouettes, thin balancing lines, organic primary shapes).
- Example D: "Spectral Prismatic Diffusion" (Glassmorphism, caustic refraction, soft-focus morphing gradients).

**GOAL:**
Return ONLY a raw JSON array of 3 *NEW*, creative names for these directions (e.g. ["Tactile Risograph Press", "Kinetic Silhouette Balance", "Primary Pigment Gridwork"]).
        `.trim();
        }

        const styleResponse = await ai.models.generateContent({
            model: aiModel,
            contents: { role: 'user', parts: [{ text: stylePrompt }] }
        });

        let generatedStyles: string[] | null = null;
        const styleText = styleResponse.text || '[]';
        generatedStyles = extractJsonArray(styleText) as string[] | null;

        if (!generatedStyles || generatedStyles.length < 3) {
            generatedStyles = [
                "Primary Pigment Gridwork",
                "Tactile Risograph Layering",
                "Kinetic Silhouette Balance"
            ];
        }
        
        generatedStyles = generatedStyles.slice(0, 3);

        setSessions(prev => prev.map(s => {
            if (s.id !== sessionId) return s;
            return {
                ...s,
                artifacts: s.artifacts.map((art, i) => ({
                    ...art,
                    styleName: generatedStyles[i]
                }))
            };
        }));

        const generateArtifact = async (artifact: Artifact, styleInstruction: string) => {
            try {
                let prompt = '';
                if (focusedHtml) {
                    prompt = `
You are Flash UI. The user wants to iterate on an existing UI component.

**USER REQUEST:** "${trimmedInput}"

**CONCEPTUAL DIRECTION FOR THIS VARIATION:** ${styleInstruction}

**VISUAL EXECUTION RULES:**
1. **Materiality**: Use the specified metaphor to drive every CSS choice. (e.g. if Risograph, use \`feTurbulence\` for grain and \`mix-blend-mode: multiply\` for ink layering).
2. **Typography**: Use high-quality web fonts. Pair a bold sans-serif with a refined monospace for data.
3. **Motion**: Include subtle, high-performance CSS/JS animations.
4. **IP SAFEGUARD**: No artist names or trademarks. 

**PREVIOUS HTML TO MODIFY:**
\`\`\`html
${focusedHtml}
\`\`\`

Based on the previous HTML, apply the user request and the new conceptual direction.
Return ONLY RAW FULL HTML. No markdown fences.
          `.trim();
                } else {
                    prompt = `
You are Flash UI. Create a stunning, high-fidelity UI component for: "${trimmedInput}".

**CONCEPTUAL DIRECTION: ${styleInstruction}**

**VISUAL EXECUTION RULES:**
1. **Materiality**: Use the specified metaphor to drive every CSS choice. (e.g. if Risograph, use \`feTurbulence\` for grain and \`mix-blend-mode: multiply\` for ink layering).
2. **Typography**: Use high-quality web fonts. Pair a bold sans-serif with a refined monospace for data.
3. **Motion**: Include subtle, high-performance CSS/JS animations (hover transitions, entry reveals).
4. **IP SAFEGUARD**: No artist names or trademarks. 
5. **Layout**: Be bold with negative space and hierarchy. Avoid generic cards.

Return ONLY RAW HTML. No markdown fences.
          `.trim();
                }
          
                const responseStream = await ai.models.generateContentStream({
                    model: aiModel,
                    contents: [{ parts: [{ text: prompt }], role: "user" }],
                });

                let accumulatedHtml = '';
                for await (const chunk of responseStream) {
                    const text = chunk.text;
                    if (typeof text === 'string') {
                        accumulatedHtml += text;
                        setSessions(prev => prev.map(sess => 
                            sess.id === sessionId ? {
                                ...sess,
                                artifacts: sess.artifacts.map(art => 
                                    art.id === artifact.id ? { ...art, html: accumulatedHtml } : art
                                )
                            } : sess
                        ));
                    }
                }
                
                let finalHtml = accumulatedHtml.trim();
                if (finalHtml.startsWith('```html')) finalHtml = finalHtml.substring(7).trimStart();
                if (finalHtml.startsWith('```')) finalHtml = finalHtml.substring(3).trimStart();
                if (finalHtml.endsWith('```')) finalHtml = finalHtml.substring(0, finalHtml.length - 3).trimEnd();

                setSessions(prev => prev.map(sess => 
                    sess.id === sessionId ? {
                        ...sess,
                        artifacts: sess.artifacts.map(art => 
                            art.id === artifact.id ? { ...art, html: finalHtml, status: finalHtml ? 'complete' : 'error' } : art
                        )
                    } : sess
                ));

            } catch (e: any) {
                console.error('Error generating artifact:', e);
                setSessions(prev => prev.map(sess => 
                    sess.id === sessionId ? {
                        ...sess,
                        artifacts: sess.artifacts.map(art => 
                            art.id === artifact.id ? { ...art, html: `<div style="color: #ff6b6b; padding: 20px;">Error: ${e.message}</div>`, status: 'error' } : art
                        )
                    } : sess
                ));
            }
        };

        await Promise.all(placeholderArtifacts.map((art, i) => generateArtifact(art, generatedStyles[i])));

    } catch (e) {
        console.error("Fatal error in generation process", e);
    } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [inputValue, isLoading, sessions.length, activeStyle, aiModel]);

  const handleSurpriseMe = () => {
      const currentPrompt = placeholders[placeholderIndex];
      setInputValue(currentPrompt);
      handleSendMessage(currentPrompt);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isLoading) {
      event.preventDefault();
      handleSendMessage();
    } else if (event.key === 'Tab' && !inputValue && !isLoading) {
        event.preventDefault();
        setInputValue(placeholders[placeholderIndex]);
    }
  };

  const nextItem = useCallback(() => {
      if (focusedArtifactIndex !== null) {
          if (focusedArtifactIndex < 2) setFocusedArtifactIndex(focusedArtifactIndex + 1);
      } else {
          if (currentSessionIndex < sessions.length - 1) setCurrentSessionIndex(currentSessionIndex + 1);
      }
  }, [currentSessionIndex, sessions.length, focusedArtifactIndex]);

  const prevItem = useCallback(() => {
      if (focusedArtifactIndex !== null) {
          if (focusedArtifactIndex > 0) setFocusedArtifactIndex(focusedArtifactIndex - 1);
      } else {
           if (currentSessionIndex > 0) setCurrentSessionIndex(currentSessionIndex - 1);
      }
  }, [currentSessionIndex, focusedArtifactIndex]);

  const handleResetWorkspace = () => {
      setSessions([]);
      setCurrentSessionIndex(-1);
      setFocusedArtifactIndex(null);
      setInputValue('');
      setDrawerState({ isOpen: false, mode: 'history', title: '', data: null });
  };

  const handleOpenSettings = () => {
      setDrawerState({ isOpen: true, mode: 'settings', title: 'Settings', data: null });
  };

  const handleOpenHistory = () => {
      setDrawerState({ isOpen: true, mode: 'history', title: 'Prompt History', data: null });
  };

  useEffect(() => {
      const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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

  const isLoadingDrawer = isLoading && drawerState.mode === 'variations' && componentVariations.length === 0;

  const hasStarted = sessions.length > 0 || isLoading;
  const currentSession = sessions[currentSessionIndex];

  let canGoBack = false;
  let canGoForward = false;

  if (hasStarted) {
      if (focusedArtifactIndex !== null) {
          canGoBack = focusedArtifactIndex > 0;
          canGoForward = focusedArtifactIndex < (currentSession?.artifacts.length || 0) - 1;
      } else {
          canGoBack = currentSessionIndex > 0;
          canGoForward = currentSessionIndex < sessions.length - 1;
      }
  }

  const handleCopyCode = async () => {
      if (drawerState.data) {
          try {
              await navigator.clipboard.writeText(drawerState.data);
              alert("Copied to clipboard!");
          } catch (e) {
              console.error("Clipboard failed", e);
          }
      }
  };

  const handleDownloadCode = () => {
      if (drawerState.data) {
          const blob = new Blob([drawerState.data], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const safeTitle = drawerState.title.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'export';
          a.download = `${safeTitle}.html`;
          a.click();
          URL.revokeObjectURL(url);
      }
  };

  return (
    <>
        <button onClick={toggleFullscreen} className="fullscreen-button" aria-label="Toggle Fullscreen" style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isFullscreen ? <MinimizeIcon /> : <FullscreenIcon />}
        </button>

        <div className="top-right-actions">
            <button onClick={handleResetWorkspace} className="creator-credit" aria-label="New Design" style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PlusIcon />
            </button>
            <button onClick={handleOpenHistory} className="creator-credit" aria-label="History" style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HistoryIcon />
            </button>
            <button onClick={handleOpenSettings} className="creator-credit" aria-label="Settings" style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SettingsIcon />
            </button>
        </div>

        <SideDrawer 
            isOpen={drawerState.isOpen} 
            onClose={() => setDrawerState(s => ({...s, isOpen: false}))} 
            title={drawerState.title}
        >
            {isLoadingDrawer && (
                 <div className="loading-state">
                     <ThinkingIcon /> 
                     Designing variations...
                 </div>
            )}

            {drawerState.mode === 'code' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', justifyContent: 'flex-end', padding: '0 24px' }}>
                        <button onClick={handleCopyCode} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '99px', cursor: 'pointer' }}>
                            <CopyIcon /> Copy
                        </button>
                        <button onClick={handleDownloadCode} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--text-primary)', border: '1px solid transparent', color: 'var(--app-bg)', borderRadius: '99px', cursor: 'pointer', fontWeight: 500 }}>
                            <DownloadIcon /> Save HTML
                        </button>
                    </div>
                    <pre className="code-block" style={{ flex: 1, margin: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}><code>{drawerState.data}</code></pre>
                </div>
            )}
            
            {drawerState.mode === 'variations' && (
                <div className="sexy-grid">
                    {componentVariations.map((v, i) => (
                         <div key={i} className="sexy-card" onClick={() => applyVariation(v.html)}>
                             <div className="sexy-preview">
                                 <iframe srcDoc={v.html} title={v.name} sandbox="allow-scripts allow-same-origin" />
                             </div>
                             <div className="sexy-label">{v.name}</div>
                         </div>
                    ))}
                </div>
            )}

            {drawerState.mode === 'settings' && (
                <div className="settings-container" style={{ padding: '24px', color: 'var(--text-secondary)' }}>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '1.2rem', fontWeight: 600 }}>Preferences</h3>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>AI Model</label>
                        <select value={aiModel} onChange={e => setAiModel(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--accent-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                            <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                            <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
                            <option value="gemini-3.1-pro-preview-customtools">Gemini 3.1 Pro Preview (Custom Tools)</option>
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                        </select>
                        <p style={{ fontSize: '0.85rem', marginTop: '8px', opacity: 0.7 }}>Select the model used for UI generation.</p>
                    </div>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Custom API Key</label>
                        <input 
                            type="password" 
                            value={customApiKey}
                            onChange={(e) => {
                                const val = e.target.value;
                                setCustomApiKey(val);
                                localStorage.setItem('gemini_api_key', val);
                            }}
                            placeholder="Enter Gemini API Key..."
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--accent-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                        />
                        <p style={{ fontSize: '0.85rem', marginTop: '8px', opacity: 0.7 }}>By default, the platform API key is used inside the preview, but you can provide your own to deploy on custom environments like GitHub Pages without a backend server.</p>
                    </div>

                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '1.2rem', fontWeight: 600 }}>Saved Styles</h3>
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                             {savedStyles.map(s => (
                                 <span 
                                     key={s} 
                                     onClick={() => setActiveStyle(prev => prev === s ? null : s)}
                                     style={{ 
                                         padding: '6px 12px', 
                                         background: activeStyle === s ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)', 
                                         color: activeStyle === s ? '#fff' : 'inherit',
                                         borderRadius: '99px', 
                                         fontSize: '0.85rem',
                                         cursor: 'pointer',
                                         border: activeStyle === s ? '1px solid rgba(255,255,255,0.5)' : '1px solid transparent',
                                         transition: 'all 0.2s ease'
                                     }}
                                 >
                                     {s}
                                 </span>
                             ))}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                             <input 
                                 type="text" 
                                 id="newStyleInput" 
                                 placeholder="New style name..." 
                                 style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                                 onKeyDown={(e) => {
                                     if (e.key === 'Enter') {
                                         const val = e.currentTarget.value.trim();
                                         if (val && !savedStyles.includes(val)) {
                                             setSavedStyles(prev => [...prev, val]);
                                             setActiveStyle(val);
                                         }
                                         e.currentTarget.value = '';
                                     }
                                 }}
                             />
                             <button onClick={() => {
                                 const input = document.getElementById('newStyleInput') as HTMLInputElement;
                                 const val = input?.value.trim();
                                 if (val && !savedStyles.includes(val)) {
                                     setSavedStyles(prev => [...prev, val]);
                                     setActiveStyle(val);
                                 }
                                 if (input) input.value = '';
                             }} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.15)', cursor: 'pointer', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: 500 }}>Save</button>
                        </div>
                        <p style={{ fontSize: '0.85rem', marginTop: '12px', opacity: 0.7 }}>Select a style above to apply it to your next generation prompt. Add new custom styles using the input field.</p>
                    </div>
                </div>
            )}

            {drawerState.mode === 'history' && (
                <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>
                    {sessions.length === 0 ? (
                        <p>No generated iterations yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {sessions.map((sess, idx) => (
                                <div 
                                    key={sess.id} 
                                    onClick={() => {
                                        setCurrentSessionIndex(idx);
                                        setFocusedArtifactIndex(null);
                                        setDrawerState(s => ({...s, isOpen: false}));
                                    }}
                                    style={{ 
                                        padding: '16px', 
                                        background: idx === currentSessionIndex ? 'rgba(255,255,255,0.1)' : 'var(--input-bg)', 
                                        borderRadius: '8px', 
                                        cursor: 'pointer',
                                        border: idx === currentSessionIndex ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border-color)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: '8px', lineHeight: '1.4' }}>{sess.prompt}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Iteration {idx + 1} &bull; {new Date(sess.timestamp).toLocaleTimeString()}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </SideDrawer>

        <div className={`immersive-app ${isFullscreen ? 'is-fullscreen' : ''}`}>
            <DottedGlowBackground 
                gap={24} 
                radius={1.5} 
                color="rgba(255, 255, 255, 0.02)" 
                glowColor="rgba(255, 255, 255, 0.15)" 
                speedScale={0.5} 
            />

            <div className={`stage-container ${focusedArtifactIndex !== null ? 'mode-focus' : 'mode-split'}`}>
                 <div className={`empty-state ${hasStarted ? 'fade-out' : ''}`}>
                     <div className="empty-content">
                         <h1>Flash UI</h1>
                         <p>Creative UI generation in a flash</p>
                         <button className="surprise-button" onClick={handleSurpriseMe} disabled={isLoading}>
                             <SparklesIcon /> Surprise Me
                         </button>
                     </div>
                 </div>

                {sessions.map((session, sIndex) => {
                    let positionClass = 'hidden';
                    if (sIndex === currentSessionIndex) positionClass = 'active-session';
                    else if (sIndex < currentSessionIndex) positionClass = 'past-session';
                    else if (sIndex > currentSessionIndex) positionClass = 'future-session';
                    
                    return (
                        <div key={session.id} className={`session-group ${positionClass}`}>
                            <div className="artifact-grid" ref={sIndex === currentSessionIndex ? gridScrollRef : null}>
                                {session.artifacts.map((artifact, aIndex) => {
                                    const isFocused = focusedArtifactIndex === aIndex;
                                    
                                    return (
                                        <ArtifactCard 
                                            key={artifact.id}
                                            artifact={artifact}
                                            isFocused={isFocused}
                                            onClick={() => setFocusedArtifactIndex(aIndex)}
                                            viewport={isFocused ? viewport : 'desktop'}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

             {canGoBack && (
                <button className="nav-handle left" onClick={prevItem} aria-label="Previous">
                    <ArrowLeftIcon />
                </button>
             )}
             {canGoForward && (
                <button className="nav-handle right" onClick={nextItem} aria-label="Next">
                    <ArrowRightIcon />
                </button>
             )}

            <div className="bottom-hover-zone"></div>

            <div className={`action-bar ${focusedArtifactIndex !== null ? 'visible' : ''}`}>
                 <div className="active-prompt-label">
                    {currentSession?.prompt}
                 </div>
                 <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center'}}>
                     <div className="action-buttons-group">
                         <button onClick={() => setViewport('desktop')} className={viewport === 'desktop' ? 'active-viewport' : ''} aria-label="Desktop view" title="Desktop view">
                             <DesktopIcon />
                         </button>
                         <button onClick={() => setViewport('tablet')} className={viewport === 'tablet' ? 'active-viewport' : ''} aria-label="Tablet view" title="Tablet view">
                             <TabletIcon />
                         </button>
                         <button onClick={() => setViewport('mobile')} className={viewport === 'mobile' ? 'active-viewport' : ''} aria-label="Mobile view" title="Mobile view">
                             <MobileIcon />
                         </button>
                     </div>
                     <div className="action-buttons">
                        <button onClick={() => setFocusedArtifactIndex(null)}>
                            <GridIcon /> Grid View
                        </button>
                        <button onClick={handleGenerateVariations} disabled={isLoading}>
                            <SparklesIcon /> Variations
                        </button>
                        <button onClick={handleShowCode}>
                            <CodeIcon /> Source
                        </button>
                     </div>
                 </div>
            </div>

            <div className="floating-input-container">
                <div className={`input-wrapper ${isLoading ? 'loading' : ''}`}>
                    {(!inputValue && !isLoading) && (
                        <div className="animated-placeholder" key={placeholderIndex}>
                            <span className="placeholder-text">{placeholders[placeholderIndex]}</span>
                            <span className="tab-hint">Tab</span>
                        </div>
                    )}
                    {!isLoading ? (
                        <input 
                            ref={inputRef}
                            type="text" 
                            value={inputValue} 
                            onChange={handleInputChange} 
                            onKeyDown={handleKeyDown} 
                            disabled={isLoading} 
                        />
                    ) : (
                        <div className="input-generating-label">
                            <span className="generating-prompt-text">{currentSession?.prompt}</span>
                            <ThinkingIcon />
                        </div>
                    )}
                    <button className="send-button" onClick={() => handleSendMessage()} disabled={isLoading || !inputValue.trim()}>
                        <ArrowUpIcon />
                    </button>
                </div>
            </div>
        </div>
    </>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<React.StrictMode><App /></React.StrictMode>);
}