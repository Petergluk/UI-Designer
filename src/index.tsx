/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

//Vibe coded by ammaar@google.com

import { GoogleGenAI } from '@google/genai';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';

import { Artifact, Session, ComponentVariation } from './types';
import { INITIAL_PLACEHOLDERS, STYLE_GALLERY } from './constants';
import { generateId, extractJsonArray } from './utils';

import { PROMPTS } from './prompts';
import { useFlashUI } from './hooks/useFlashUI';

import DottedGlowBackground from './components/DottedGlowBackground';
import ArtifactCard from './components/ArtifactCard';
import SideDrawer from './components/SideDrawer';
import { CodePanel, DesignMdPanel, VariationsPanel, GalleryPanel, SettingsPanel, HistoryPanel } from './components/Panels';
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
    PlusIcon,
    ImageIcon,
    TrashIcon,
    GalleryIcon,
    PaletteIcon
} from './components/Icons';

type Viewport = 'desktop' | 'tablet' | 'mobile';

function App() {
  const {
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
  } = useFlashUI();

  const handleSendMessage = useCallback(async (manualPrompt?: string, styleOverride?: string) => {
    let promptToUse = manualPrompt || inputValue;
    const isTargetedRefinement = currentSessionIndex >= 0 && sessions[currentSessionIndex] && focusedArtifactIndex !== null;

    if (!promptToUse.trim() && styleOverride && isTargetedRefinement) {
        promptToUse = "Translate this design strictly to the new style. Keep all functional content and structure intact.";
    }

    const trimmedInput = promptToUse.trim();
    
    if (!trimmedInput || isLoading) return;
    if (!manualPrompt && !styleOverride) setInputValue('');

    setIsLoading(true);
    const baseTime = Date.now();
    const sessionId = generateId();

    let targetStyleNames: string[] = [];
    if (styleOverride) {
        targetStyleNames = [styleOverride];
    } else if (isTargetedRefinement) {
        targetStyleNames = [sessions[currentSessionIndex].artifacts[focusedArtifactIndex].styleName];
    } else {
        targetStyleNames = selectedStyles.length > 0 
           ? selectedStyles.map(id => {
               const found = STYLE_GALLERY.find(s => s.id === id);
               return found ? found.name : id;
           })
           : ['Минимализм'];
    }

    // fallback mapping if STYLE_GALLERY isn't directly accessible in this scope properly yet (we will import it in next step)
    
    const placeholderArtifacts: Artifact[] = targetStyleNames.map((styleName, i) => ({
        id: `${sessionId}_${i}`,
        styleName: styleName,
        html: '',
        status: 'streaming',
    }));

    const sessionPrompt = styleOverride ? `${trimmedInput} (${styleOverride})` : trimmedInput;

    const previousSession = isTargetedRefinement ? sessions[currentSessionIndex] : null;
    const focusedHtml = isTargetedRefinement ? previousSession?.artifacts[focusedArtifactIndex]?.html : null;

    const newSession: Session = {
        id: sessionId,
        prompt: sessionPrompt,
        timestamp: baseTime,
        artifacts: placeholderArtifacts
    };

    setSessions(prev => [...prev, newSession]);
    setCurrentSessionIndex(sessions.length); 
    setFocusedArtifactIndex(isTargetedRefinement ? 0 : null); 
    
    const currentImages = [...images];
    setImages([]);

    try {
        const apiKey = customApiKey || process.env.API_KEY;
        if (!apiKey) throw new Error("API_KEY is not configured.");
        const ai = new GoogleGenAI({ apiKey });

        const generateArtifact = async (artifact: Artifact, styleInstruction: string) => {
            try {
                let prompt = '';
                if (focusedHtml) {
                    prompt = PROMPTS.refineComponent(trimmedInput, styleInstruction, focusedHtml);
                } else {
                    prompt = PROMPTS.createComponent(trimmedInput, styleInstruction);
                }
          
                const parts: any[] = [{ text: prompt }];
                if (currentImages.length > 0) {
                     currentImages.forEach(img => {
                         parts.push({
                             inlineData: {
                                 data: img.base64,
                                 mimeType: img.mimeType
                             }
                         });
                     });
                }
                
                const responseStream = await ai.models.generateContentStream({
                    model: aiModel,
                    contents: [{ parts, role: "user" }],
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
                
                if (!finalHtml) {
                    finalHtml = `<div style="color: white; padding: 24px; font-family: sans-serif; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #111; box-sizing: border-box;"><h2 style="margin:0 0 12px 0;">No UI Generated</h2><p style="text-align: center; max-width: 400px; color: rgba(255,255,255,0.7);">The AI returned an empty response. Please try modifying your prompt.</p></div>`;
                }

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
                            art.id === artifact.id ? { ...art, html: `<div style="color: #ff6b6b; padding: 24px; font-family: sans-serif; height: 100vh; background: #2a0808; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; box-sizing: border-box;"><h2>Generation Error</h2><p>${e.message}</p></div>`, status: 'error' } : art
                        )
                    } : sess
                ));
            }
        };

        await Promise.all(placeholderArtifacts.map((art, i) => generateArtifact(art, targetStyleNames[i])));

    } catch (e: any) {
        console.error("Fatal error in generation process", e);
        setSessions(prev => prev.map(sess => 
            sess.id === sessionId ? {
                ...sess,
                artifacts: sess.artifacts.map(art => 
                    art.status === 'streaming' ? { ...art, html: `<div style="color: #ff6b6b; padding: 24px; font-family: sans-serif; height: 100vh; background: #2a0808; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; box-sizing: border-box;"><h2>Generation Fatal Error</h2><p>${e.message}</p></div>`, status: 'error' } : art
                )
            } : sess
        ));
    } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [inputValue, isLoading, sessions, currentSessionIndex, focusedArtifactIndex, selectedStyles, images, activeStyle, aiModel, customApiKey]);

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

  const handleOpenGallery = () => {
      setDrawerState({ isOpen: true, mode: 'gallery', title: 'Style Gallery', data: null });
  };

  const handleOpenHistory = () => {
      setDrawerState({ isOpen: true, mode: 'history', title: 'Prompt History', data: null });
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
          const safeTitle = drawerState.title.replace('Source - ', '').replace(/[^a-z0-9а-яё]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'export';
          a.download = `${safeTitle}.html`;
          a.click();
          URL.revokeObjectURL(url);
      }
  };

  const handleDownloadDesignFile = () => {
      if (drawerState.data) {
          const blob = new Blob([drawerState.data], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'DESIGN.md';
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
            <button onClick={handleResetWorkspace} className="creator-credit" aria-label="New Design" title="New Design" style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PlusIcon />
            </button>
            <button onClick={handleOpenGallery} className="creator-credit" aria-label="Gallery" title="Style Gallery" style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GalleryIcon />
            </button>
            <button onClick={handleOpenHistory} className="creator-credit" aria-label="History" title="Prompt History" style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HistoryIcon />
            </button>
            <button onClick={handleOpenSettings} className="creator-credit" aria-label="Settings" title="Settings" style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SettingsIcon />
            </button>
        </div>

        <SideDrawer 
            isOpen={drawerState.isOpen} 
            onClose={() => setDrawerState(s => ({...s, isOpen: false}))} 
            title={drawerState.title}
            fullScreen={drawerState.mode === 'gallery'}
        >
            {isLoadingDrawer && (
                 <div className="loading-state">
                     <ThinkingIcon /> 
                     Designing variations...
                 </div>
            )}

            {drawerState.mode === 'code' && (
                <CodePanel 
                    data={drawerState.data as string}
                    handleCopyCode={handleCopyCode}
                    handleDownloadCode={handleDownloadCode}
                />
            )}
            
            {drawerState.mode === 'design-md' && (
                <DesignMdPanel 
                    data={drawerState.data as string}
                    handleDownloadDesignFile={handleDownloadDesignFile}
                />
            )}
            
            {drawerState.mode === 'variations' && (
                <VariationsPanel 
                    variations={componentVariations}
                    applyVariation={applyVariation}
                />
            )}

            {drawerState.mode === 'gallery' && (
                <GalleryPanel 
                    focusedArtifactIndex={focusedArtifactIndex}
                    selectedStyles={selectedStyles}
                    toggleStyleSelection={toggleStyleSelection}
                    onStyleSelect={(styleName) => {
                        setDrawerState(s => ({ ...s, isOpen: false }));
                        handleSendMessage(undefined, styleName);
                    }}
                />
            )}

            {drawerState.mode === 'settings' && (
                <SettingsPanel 
                    aiModel={aiModel} setAiModel={setAiModel}
                    customApiKey={customApiKey} setCustomApiKey={setCustomApiKey}
                    savedStyles={savedStyles} setSavedStyles={setSavedStyles}
                    activeStyle={activeStyle} setActiveStyle={setActiveStyle}
                />
            )}

            {drawerState.mode === 'history' && (
                <HistoryPanel 
                    sessions={sessions}
                    currentSessionIndex={currentSessionIndex}
                    onSelectSession={(idx) => {
                        setCurrentSessionIndex(idx);
                        setFocusedArtifactIndex(null);
                        setDrawerState(s => ({...s, isOpen: false}));
                    }}
                />
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
                                            onDelete={() => handleDeleteArtifact(sIndex, artifact.id)}
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

            <div className={`bottom-ui-layer ${isFullscreen ? 'fullscreen-controls' : ''}`}>
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
                            <button onClick={handleOpenGallery} disabled={isLoading}>
                                <PaletteIcon /> Change Style
                            </button>
                            <button onClick={handleGenerateVariations} disabled={isLoading}>
                                <SparklesIcon /> Variations
                            </button>
                            <button onClick={handleShowCode}>
                                <CodeIcon /> Source
                            </button>
                            <button onClick={handleGenerateDesignMd}>
                                <DownloadIcon /> DESIGN.md
                            </button>
                         </div>
                     </div>
                </div>

                <div className="floating-input-container" style={{ flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    {images.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', maxWidth: '800px', width: '100%', padding: '0 24px' }}>
                             {images.map((img, i) => (
                                 <div key={i} style={{ position: 'relative', width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                                    <img src={img.dataUrl} alt="Upload" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button onClick={() => removeImage(i)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', lineHeight: '14px' }}>&times;</button>
                                 </div>
                             ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '660px', padding: '0 20px', alignItems: 'center', justifyContent: 'center' }}>
                        <button onClick={handleOpenGallery} className="gallery-open-button" aria-label="Style Gallery" title="Style Gallery">
                            <GalleryIcon />
                        </button>
                        <label className="gallery-open-button" style={{ cursor: 'pointer', margin: 0 }} aria-label="Upload Image" title="Upload Image">
                            <input type="file" multiple accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={isLoading} />
                            <ImageIcon />
                        </label>
                        <div className={`input-wrapper ${isLoading ? 'loading' : ''}`}>
                            {(!inputValue && !isLoading) && (
                                <div className="animated-placeholder" key={placeholderIndex} style={{ left: '24px' }}>
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
            </div>
        </div>
    </>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  if (!(window as any)._reactRoot) {
    (window as any)._reactRoot = ReactDOM.createRoot(rootElement);
  }
  (window as any)._reactRoot.render(<React.StrictMode><App /></React.StrictMode>);
}