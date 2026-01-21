import { useState, useCallback, useRef } from 'react';
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

import { enrichPrompt } from './services/promptEnricher';
import { wrapGcode, estimatePrint } from './services/gcodeGenerator';

// Pipeline states
type AppState = 'idle' | 'listening' | 'generating' | 'ready' | 'slicing' | 'printing' | 'done';

function App() {
  const { t, i18n } = useTranslation();
  const [appState, setAppState] = useState<AppState>('idle');
  const [gcode, setGcode] = useState<string | null>(null);
  const [printEstimate, setPrintEstimate] = useState<{ minutes: number; layers: number } | null>(null);

  // Hooks
  const speech = useSpeechRecognition();
  const tripo = useTripoAI();
  const serial = useWebSerial();
  const savedModels = useSavedModels();
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isRefineMode, setIsRefineMode] = useState(false);
  const modelViewerRef = useRef<HTMLElement | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const cloudSync = useCloudSync();

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

  // Capture screenshot from model-viewer
  const captureScreenshot = useCallback(async (): Promise<string | null> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelViewer = modelViewerRef.current as any;
    if (!modelViewer) return null;

    try {
      // model-viewer has a toDataURL method
      const dataUrl = await modelViewer.toDataURL('image/png');
      console.log('📷 Screenshot captured');
      return dataUrl;
    } catch (e) {
      console.error('Screenshot error:', e);
      return null;
    }
  }, []);

  // Handle voice button release
  const handleVoiceRelease = useCallback(async () => {
    speech.stopListening();

    // Wait a bit for final transcript
    await new Promise(resolve => setTimeout(resolve, 500));

    if (speech.transcript) {
      setAppState('generating');

      let modelUrl: string | null = null;

      if (isRefineMode && tripo.modelUrl) {
        // REFINE MODE: Use image-to-model with screenshot
        console.log('🔄 Refine mode: capturing screenshot and refining');

        const screenshot = await captureScreenshot();
        if (screenshot) {
          // Combine prompts and enrich
          const newPrompt = `${currentPrompt}, ${speech.transcript}`;
          setCurrentPrompt(newPrompt);
          const enrichedPrompt = enrichPrompt(newPrompt);

          modelUrl = await tripo.refine(screenshot, enrichedPrompt);
        } else {
          // Fallback to regular generation if screenshot fails
          const newPrompt = `${currentPrompt}, ${speech.transcript}`;
          setCurrentPrompt(newPrompt);
          const enrichedPrompt = enrichPrompt(newPrompt);
          modelUrl = await tripo.generate(enrichedPrompt);
        }
      } else {
        // NEW GENERATION: Use text-to-model
        setCurrentPrompt(speech.transcript);
        const enrichedPrompt = enrichPrompt(speech.transcript);
        modelUrl = await tripo.generate(enrichedPrompt);
      }

      if (modelUrl) {
        setAppState('ready');

        // For MVP, we'll use a placeholder G-code
        const placeholderGcode = generatePlaceholderGcode();
        setGcode(placeholderGcode);

        const estimate = estimatePrint(placeholderGcode);
        setPrintEstimate({ minutes: estimate.estimatedMinutes, layers: estimate.layers });
      } else {
        setAppState('idle');
      }
    } else {
      setAppState('idle');
    }

    setIsRefineMode(false);
  }, [speech, tripo, currentPrompt, isRefineMode, captureScreenshot]);

  // Handle print
  const handlePrint = useCallback(async () => {
    if (!gcode || serial.status !== 'connected') return;

    setAppState('printing');

    const fullGcode = wrapGcode(gcode);
    await serial.print(fullGcode);

    setAppState('done');
  }, [gcode, serial]);

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
        <h1>{t('app.title')}</h1>
        <p>{t('app.subtitle')}</p>
        <div className="header-buttons">
          <button className="cloud-btn" onClick={() => setShowPinModal(true)} title="Облачная синхронизация">
            ☁️ {cloudSync.pin ? `PIN: ${cloudSync.pin}` : 'Синхро'}
          </button>
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

        {/* Error display */}
        {speech.error && (
          <div className="error-message">{speech.error}</div>
        )}
        {tripo.error && (
          <div className="error-message">{tripo.error}</div>
        )}

        {/* Loading indicator */}
        {appState === 'generating' && (
          <div className="status-message">
            <span className="status-icon">🎨</span>
            <span>{t('voice.processing')}</span>
            {tripo.progress > 0 && <span className="progress">{tripo.progress}%</span>}
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
              onClick={() => {
                if (currentPrompt && tripo.modelUrl) {
                  savedModels.saveModel(currentPrompt, tripo.modelUrl);
                }
              }}
              title="Сохранить в галерею"
            >
              💾 Сохранить
            </button>
            <button
              className="control-btn refine-btn"
              onClick={() => handleVoicePress(true)}
              title="Улучшить модель (Image-to-3D)"
            >
              ✨ Дорисовать
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

        {/* Printer Panel */}
        <PrinterPanel
          status={serial.status}
          progress={serial.progress}
          error={serial.error}
          isSupported={serial.isSupported}
          onConnect={() => serial.connect()}
          onDisconnect={() => serial.disconnect()}
          onPrint={handlePrint}
          canPrint={!!gcode && appState === 'ready'}
        />

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
          onDelete={(id) => savedModels.deleteModel(id)}
        />
      </main>

      {/* Browser support warning */}
      {!speech.isSupported && (
        <div className="browser-warning">
          ⚠️ Используй Chrome или Edge для голосового управления
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
        onSync={async () => {
          const success = await cloudSync.syncToCloud(savedModels.models);
          if (success) {
            setShowPinModal(false);
          }
        }}
        onRestore={async () => {
          const models = await cloudSync.loadFromCloud();
          if (models && models.length > 0) {
            // Merge with local models
            models.forEach(m => {
              if (!savedModels.models.find(existing => existing.id === m.id)) {
                savedModels.saveModel(m.prompt, m.modelUrl, m.thumbnail);
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
