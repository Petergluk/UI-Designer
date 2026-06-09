import React from 'react';
import { ThinkingIcon, CopyIcon, DownloadIcon } from './Icons';
import { Session, ComponentVariation } from '../types';
import { STYLE_GALLERY } from '../constants';

// ---- Code Panel ----

export const CodePanel = ({ 
    data, 
    handleCopyCode, 
    handleDownloadCode 
}: { 
    data: string, 
    handleCopyCode: () => void, 
    handleDownloadCode: () => void 
}) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', justifyContent: 'flex-end', padding: '0 24px' }}>
            <button onClick={handleCopyCode} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '99px', cursor: 'pointer' }}>
                <CopyIcon /> Copy
            </button>
            <button onClick={handleDownloadCode} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--text-primary)', border: '1px solid transparent', color: 'var(--app-bg)', borderRadius: '99px', cursor: 'pointer', fontWeight: 500 }}>
                <DownloadIcon /> Save HTML
            </button>
        </div>
        <pre className="code-block" style={{ flex: 1, margin: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}><code>{data}</code></pre>
    </div>
);

// ---- Design MD Panel ----

export const DesignMdPanel = ({ 
    data, 
    handleDownloadDesignFile 
}: { 
    data: string, 
    handleDownloadDesignFile: () => void 
}) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', justifyContent: 'flex-end', padding: '0 24px' }}>
            <button onClick={handleDownloadDesignFile} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--text-primary)', border: '1px solid transparent', color: 'var(--app-bg)', borderRadius: '99px', cursor: 'pointer', fontWeight: 500 }}>
                <DownloadIcon /> Save DESIGN.md
            </button>
        </div>
        <pre className="code-block" style={{ flex: 1, margin: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, whiteSpace: 'pre-wrap' }}><code>{data}</code></pre>
    </div>
);

// ---- Variations Panel ----

export const VariationsPanel = ({ 
    variations, 
    applyVariation 
}: { 
    variations: ComponentVariation[], 
    applyVariation: (html: string) => void 
}) => (
    <div className="sexy-grid">
        {variations.map((v, i) => (
             <div key={i} className="sexy-card" onClick={() => applyVariation(v.html)}>
                 <div className="sexy-preview">
                     <iframe srcDoc={v.html} title={v.name} sandbox="allow-scripts allow-same-origin" />
                 </div>
                 <div className="sexy-label">{v.name}</div>
             </div>
        ))}
    </div>
);

// ---- History Panel ----

export const HistoryPanel = ({ 
    sessions, 
    currentSessionIndex, 
    onSelectSession 
}: { 
    sessions: Session[], 
    currentSessionIndex: number,
    onSelectSession: (idx: number) => void 
}) => (
    <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>
        {sessions.length === 0 ? (
            <p>No generated iterations yet.</p>
        ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sessions.map((sess, idx) => (
                    <div 
                        key={sess.id} 
                        onClick={() => onSelectSession(idx)}
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
);

// ---- Settings Panel ----

export const SettingsPanel = ({
    aiModel, setAiModel,
    customApiKey, setCustomApiKey,
    savedStyles, setSavedStyles,
    activeStyle, setActiveStyle
}: {
    aiModel: string, setAiModel: (m: string) => void,
    customApiKey: string, setCustomApiKey: (k: string) => void,
    savedStyles: string[], setSavedStyles: React.Dispatch<React.SetStateAction<string[]>>,
    activeStyle: string | null, setActiveStyle: React.Dispatch<React.SetStateAction<string | null>>
}) => {
    return (
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
    );
};

// ---- Gallery Panel ----

export const GalleryPanel = ({
    focusedArtifactIndex,
    selectedStyles,
    toggleStyleSelection,
    onStyleSelect
}: {
    focusedArtifactIndex: number | null,
    selectedStyles: string[],
    toggleStyleSelection: (id: string) => void,
    onStyleSelect: (styleName: string) => void
}) => (
    <div style={{ padding: '24px' }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '1.2rem', fontWeight: 600 }}>
            {focusedArtifactIndex !== null ? 'Choose a style to refine' : 'Select up to 3 visual styles'}
        </h3>
        <div className="gallery-grid">
            {STYLE_GALLERY.map(style => {
                const isSelected = focusedArtifactIndex === null && selectedStyles.includes(style.id);
                return (
                    <div 
                        key={style.id} 
                        className={`gallery-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                            if (focusedArtifactIndex !== null) {
                                onStyleSelect(style.name);
                            } else {
                                toggleStyleSelection(style.id);
                            }
                        }}
                    >
                         <div className="gallery-image-wrapper">
                            <img src={style.image} alt={style.name} />
                         </div>
                         <div className="gallery-text-content">
                             <div className="label">{style.name}</div>
                             <div className="description">{style.description}</div>
                         </div>
                    </div>
                )
            })}
        </div>
        {focusedArtifactIndex === null && (
            <div style={{ marginTop: '24px', textAlign: 'center', opacity: 0.7, fontSize: '0.85rem' }}>
                Your next prompt will generate variations in these {selectedStyles.length} styles.
            </div>
        )}
    </div>
);

