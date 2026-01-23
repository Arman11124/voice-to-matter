import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';
import './App.css';

import { VoiceButton } from './components/VoiceButton';
import { ModelViewer } from './components/ModelViewer';
import { PrinterPanel } from './components/PrinterPanel';
import { SavedModelsGallery } from './components/SavedModelsGallery';
import { PinModal } from './components/PinModal';

import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useTripoAI } from './hooks/useTripoAI';
import { useWebSerial } from './hooks/useWebSerial';
import { useSavedModels } from './hooks/useSavedModels';
import { useCloudSync } from './hooks/useCloudSync';
import type { SavedModel } from './hooks/useSavedModels';
import { useSlicer } from './hooks/useSlicer'; // NEW: Slicer hook

import { enrichPrompt } from './services/promptEnricher';
import { estimatePrint } from './services/gcodeGenerator';
import { downloadAsStl } from './services/stlExporter';

// Pipeline states
type AppState = 'idle' | 'listening' | 'generating' | 'ready' | 'slicing' | 'printing' | 'done';

function App() {
  const { t, i18n } = useTranslation();
  // ... state ...
  const [appState, setAppState] = useState<AppState>('idle');
  const [gcode, setGcode] = useState<string | null>(null);
  const [printEstimate, setPrintEstimate] = useState<{ minutes: number; layers: number } | null>(null);

  // Hooks
  const speech = useSpeechRecognition();
  const tripo = useTripoAI();
  const [isSaving, setIsSaving] = useState(false); // NEW: Saving state

  const serial = useWebSerial();
  const savedModels = useSavedModels();
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [, setIsRefineMode] = useState(false); // Setter used in handleVoicePress
  const [pendingText, setPendingText] = useState<string | null>(null); // Text to confirm/edit before sending
  const modelViewerRef = useRef<HTMLElement | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const cloudSync = useCloudSync();
  const slicer = useSlicer(); // NEW: Slicer hook

  // Handle "Print via App" (Download STL for Slicer)
  const handleAppPrint = async () => {
    if (!tripo.modelUrl) return;

    console.log('🔪 Exporting STL for Slicer:', tripo.modelUrl);
    const filename = (currentPrompt || 'model').slice(0, 20).replace(/\s+/g, '_');

    // Convert GLB to STL and download
    await downloadAsStl(tripo.modelUrl, filename);
  };


  // Handle voice button press
  const handleVoicePress = useCallback((refineMode = false) => {
    if (appState !== 'idle' && appState !== 'ready' && appState !== 'done') return;

    // Don't reset model if we're refining
    if (!refineMode) {
      tripo.reset();
      setCurrentPrompt('');
    }

    setIsRefineMode(refineMode);
    setGcode(null);
    setPrintEstimate(null);
    speech.startListening();
    setAppState('listening');
  }, [appState, speech, tripo]);

  // Auto-sync models to cloud when they change (debounced)
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!cloudSync.pin || savedModels.models.length === 0) return;

    const timeoutId = setTimeout(async () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      try {
        // Only PUSH local to cloud - no pulling (prevents ghost resurrection)
        await cloudSync.syncToCloud(savedModels.models);
      } catch (e) {
        console.error("Auto-sync error", e);
      } finally {
        isSyncingRef.current = false;
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudSync.pin, savedModels.models, cloudSync.syncToCloud]);

  // POLL for changes from other devices every 10 seconds (heartbeat)
  useEffect(() => {
    if (!cloudSync.pin) return;
    const intervalId = setInterval(async () => {
      // Skip polling if sync is in progress (prevents ghost resurrection on delete)
      if (isSyncingRef.current) {
        console.log('💓 Polling skipped - sync in progress');
        return;
      }
      try {
        console.log(`💓 Polling cloud for PIN ${cloudSync.pin}...`);
        const remoteModels = await cloudSync.loadFromCloud();
        if (remoteModels) {
          console.log(`☁️ Loaded from cloud: ${remoteModels.length} models`);
          // Auto-pull disabled - only sync on explicit load
          // This prevents deleted models from reappearing
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 10000); // 10 seconds
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudSync.pin, cloudSync.loadFromCloud]);



  // Handle voice button release - now shows text for confirmation
  const handleVoiceRelease = useCallback(async () => {
    speech.stopListening();

    // Wait a bit for final transcript
    await new Promise(resolve => setTimeout(resolve, 500));

    if (speech.transcript) {
      // Show text for confirmation/editing before sending
      setPendingText(speech.transcript);
      setAppState('idle'); // Go back to idle to show confirm UI
    } else {
      setAppState('idle');
    }

    setIsRefineMode(false);
  }, [speech]);

  // Confirm and generate model with the text (editable)
  const handleConfirmGenerate = useCallback(async (text: string) => {
    setPendingText(null);
    setAppState('generating');

    const enrichedPrompt = enrichPrompt(text);
    console.log('🎤 CONFIRMED TEXT:', text);
    console.log('📤 ENRICHED PROMPT SENT TO API:', enrichedPrompt);

    setCurrentPrompt(text);
    const modelUrl = await tripo.generate(enrichedPrompt);

    if (modelUrl) {
      setAppState('ready');
      const placeholderGcode = generatePlaceholderGcode();
      setGcode(placeholderGcode);
      const estimate = estimatePrint(placeholderGcode);
      setPrintEstimate({ minutes: estimate.estimatedMinutes, layers: estimate.layers });
    } else {
      setAppState('idle');
    }
  }, [tripo]);

  // Cancel pending text
  const handleCancelPending = useCallback(() => {
    setPendingText(null);
    setAppState('idle');
  }, []);



  // Toggle language
  const toggleLanguage = () => {
    const newLang = i18n.language === 'ru' ? 'en' : 'ru';
    i18n.changeLanguage(newLang);
  };

  // Determine voice button state
  const getVoiceState = () => {
    if (appState === 'listening') return 'listening';
    if (appState === 'generating') return 'processing';
    if (speech.error) return 'error';
    return 'idle';
  };

  return (
    <div className="app">
      {/* Background */}
      <div className="background-gradient" />

      {/* Header */}
      <header className="header">
        <button className="cloud-btn header-left" onClick={() => setShowPinModal(true)} title="Облачная синхронизация">
          ☁️ {cloudSync.pin ? `PIN: ${cloudSync.pin}` : 'Синхро'}
        </button>
        <h1>{t('app.title')}</h1>
        <p>{t('app.subtitle')}</p>
        <div className="header-buttons">
          <button className="lang-toggle" onClick={toggleLanguage}>
            {i18n.language === 'ru' ? '🇬🇧 EN' : '🇷🇺 RU'}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="main">
        {/* Voice Button */}
        <VoiceButton
          state={getVoiceState()}
          transcript={speech.transcript}
          onPress={handleVoicePress}
          onRelease={handleVoiceRelease}
          disabled={appState === 'printing' || appState === 'slicing'}
        />

        {/* Text Confirmation Modal */}
        {pendingText && (
          <div className="confirm-text-overlay">
            <div className="confirm-text-modal">
              <div className="confirm-text-label">✏️ Проверьте текст:</div>
              <input
                type="text"
                className="confirm-text-input"
                defaultValue={pendingText}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmGenerate((e.target as HTMLInputElement).value);
                  } else if (e.key === 'Escape') {
                    handleCancelPending();
                  }
                }}
                id="pending-text-input"
              />
              <div className="confirm-text-buttons">
                <button
                  className="confirm-btn cancel"
                  onClick={handleCancelPending}
                >
                  ❌ Отмена
                </button>
                <button
                  className="confirm-btn confirm"
                  onClick={() => {
                    const input = document.getElementById('pending-text-input') as HTMLInputElement;
                    handleConfirmGenerate(input.value);
                  }}
                >
                  ✅ Создать
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {speech.error && (
          <div className="error-message">{speech.error}</div>
        )}
        {tripo.error && (
          <div className="error-message">{tripo.error}</div>
        )}

        {/* Loading overlay - blocks all clicks during generation */}
        {appState === 'generating' && (
          <div className="generation-overlay">
            <div className="generation-modal">
              <div className="generation-icon">🎨</div>
              <div className="generation-text">{t('voice.processing')}</div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${tripo.progress}%` }}
                />
              </div>
              <div className="progress-percentage">{tripo.progress}%</div>
              <div className="progress-hint">Пожалуйста, подождите...</div>
            </div>
          </div>
        )}

        {/* 3D Model Viewer */}
        <ModelViewer
          modelUrl={tripo.modelUrl}
          isLoading={appState === 'generating'}
          onViewerReady={(viewer) => { modelViewerRef.current = viewer; }}
        />

        {/* Model control buttons */}
        {tripo.modelUrl && appState === 'ready' && (
          <div className="model-controls">
            <button
              className="control-btn save-btn"
              onClick={async () => {
                if (currentPrompt && tripo.modelUrl) {
                  setIsSaving(true);
                  await savedModels.saveModel(currentPrompt, tripo.modelUrl);
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
              title="Сохранить в галерею"
            >
              {isSaving ? '⏳ Сохр...' : '💾 Сохранить'}
            </button>

            <button
              className="control-btn reset-btn"
              onClick={() => {
                tripo.reset();
                setGcode(null);
                setPrintEstimate(null);
                setCurrentPrompt('');
                setAppState('idle');
              }}
              title="Начать с чистого листа"
            >
              🗑️ Заново
            </button>
          </div>
        )}

        {/* Print estimate */}
        {printEstimate && appState === 'ready' && (
          <div className="print-estimate">
            <span>⏱️ ~{printEstimate.minutes} мин</span>
            <span>📐 {printEstimate.layers} слоёв</span>
          </div>
        )}

        {/* Send to Anycubic App Button (Mobile Friendly) */}
        {appState === 'ready' && (
          <div className="app-print-section" style={{ marginBottom: '1rem' }}>
            <button
              className="action-button primary-button"
              onClick={handleAppPrint}
              disabled={slicer.isSlicing}
              style={{ width: '100%', background: '#6c5ce7' }} // Purple for "Brain" action
            >
              {slicer.isSlicing ? `⚙️ Подготовка...` : '📥 Скачать STL (в слайсер)'}
            </button>
            {slicer.error && <div className="error-message">{slicer.error}</div>}

            {/* Instructions after export */}
            {slicer.exportResult && (
              <div style={{
                background: 'rgba(108, 92, 231, 0.2)',
                border: '1px solid rgba(108, 92, 231, 0.5)',
                borderRadius: '12px',
                padding: '1rem',
                marginTop: '1rem',
                textAlign: 'left'
              }}>
                {slicer.exportResult.instructions.map((line, i) => (
                  <div key={i} style={{
                    marginBottom: i < slicer.exportResult!.instructions.length - 1 ? '0.5rem' : 0,
                    fontSize: '0.9rem',
                    lineHeight: 1.4
                  }}>
                    {line}
                  </div>
                ))}
                {slicer.exportResult.slicerUrl && (
                  <button
                    onClick={() => window.open(slicer.exportResult!.slicerUrl, '_blank')}
                    style={{
                      width: '100%',
                      marginTop: '1rem',
                      padding: '0.75rem',
                      background: '#00b894',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    🌐 Открыть Kiri:Moto
                  </button>
                )}
                <button
                  onClick={() => slicer.clearResult()}
                  style={{
                    width: '100%',
                    marginTop: '0.5rem',
                    padding: '0.5rem',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.7)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  ✓ Понятно
                </button>
              </div>
            )}

            {/* Debug: Download GLB for manual verification */}
            {tripo.modelUrl && (
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                <a
                  href={tripo.modelUrl}
                  download={`${currentPrompt || 'model'}.glb`}
                  style={{
                    padding: '0.5rem',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '0.8rem'
                  }}
                >
                  📥 GLB
                </a>
                <button
                  onClick={() => downloadAsStl(tripo.modelUrl!, currentPrompt || 'model')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0.5rem',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  📥 STL (для Kiri)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Printer Panel (Only show on Desktop/Supported browsers) */}
        {serial.isSupported && (
          <PrinterPanel
            status={serial.status}
            progress={serial.progress}
            error={serial.error}
            isSupported={serial.isSupported}
            onConnect={serial.connect}
            onDisconnect={serial.disconnect}
            onPrint={() => {
              if (gcode) serial.print(gcode);
            }}
            canPrint={!!gcode && appState === 'ready'}
          />
        )}

        {/* Done message */}
        {appState === 'done' && (
          <div className="done-message">
            {t('voice.done')}
          </div>
        )}

        {/* Saved Models Gallery */}
        <SavedModelsGallery
          models={savedModels.models}
          onSelect={(model: SavedModel) => {
            // Load saved model for viewing/printing
            setCurrentPrompt(model.prompt);
            tripo.loadModel(model.modelUrl);
            setAppState('ready');

            // Generate placeholder G-code for the loaded model
            const placeholderGcode = generatePlaceholderGcode();
            setGcode(placeholderGcode);
            const estimate = estimatePrint(placeholderGcode);
            setPrintEstimate({ minutes: estimate.estimatedMinutes, layers: estimate.layers });
          }}
          onDelete={(id) => {
            // Lock polling to prevent ghost resurrection
            isSyncingRef.current = true;

            // 1. Delete locally
            savedModels.deleteModel(id);

            // 2. Force Sync to Cloud immediately
            const remainingModels = savedModels.models.filter(m => m.id !== id);
            if (cloudSync.pin) {
              cloudSync.syncToCloud(remainingModels).finally(() => {
                isSyncingRef.current = false;
              });
            } else {
              isSyncingRef.current = false;
            }
          }}
          onRename={(id, newName) => {
            savedModels.renameModel(id, newName);
            // Sync renamed model to cloud
            if (cloudSync.pin) {
              const updatedModels = savedModels.models.map(m =>
                m.id === id ? { ...m, prompt: newName } : m
              );
              cloudSync.syncToCloud(updatedModels);
            }
          }}
        />
      </main>

      {/* Browser support warning - now inline, not fixed */}
      {!speech.isSupported && (
        <div className="browser-warning">
          ⚠️ Chrome / Edge для голоса
        </div>
      )}

      {/* PIN Modal for cloud sync */}
      <PinModal
        isOpen={showPinModal}
        currentPin={cloudSync.pin}
        onSetPin={cloudSync.setPin}
        onClearPin={cloudSync.clearPin}
        checkPinExists={cloudSync.checkPinExists}
        onClose={() => setShowPinModal(false)}
        onSync={async (pinOverride) => {
          const success = await cloudSync.syncToCloud(savedModels.models, pinOverride);
          if (success) {
            setShowPinModal(false);
          }
        }}
        onRestore={async (pinOverride) => {
          const models = await cloudSync.loadFromCloud(pinOverride);
          if (models && models.length > 0) {
            // Merge with local models
            models.forEach(m => {
              // Deduplication is now handled inside saveModel too, but explicit check is fine
              if (!savedModels.models.find(existing => existing.id === m.id)) {
                savedModels.saveModel(m.prompt, m.modelUrl, m.thumbnail, m.id, m.createdAt);
              }
            });
            setShowPinModal(false);
          }
        }}
        isLoading={cloudSync.isLoading}
        error={cloudSync.error}
      />
    </div>
  );
}

// Placeholder G-code generator (real implementation would use Kiri:Moto)
function generatePlaceholderGcode(): string {
  // This is a simple cube G-code for testing
  // Real implementation would use Kiri:Moto to slice the actual model
  return `
; Simple test print
G1 Z0.3 F3000
G1 X30 Y30 F3000
G1 X30 Y80 E10 F1500
G1 X80 Y80 E20 F1500
G1 X80 Y30 E30 F1500
G1 X30 Y30 E40 F1500
;LAYER:1
G1 Z0.6
G1 X30 Y80 E50 F1500
G1 X80 Y80 E60 F1500
G1 X80 Y30 E70 F1500
G1 X30 Y30 E80 F1500
  `.trim();
}

export default App;
