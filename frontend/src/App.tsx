import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';
import './App.css';

import { VoiceButton } from './components/VoiceButton';
import { ModelViewer } from './components/ModelViewer';
import { PrinterPanel } from './components/PrinterPanel';
import { SavedModelsGallery } from './components/SavedModelsGallery';

import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useTripoAI } from './hooks/useTripoAI';
import { useWebSerial } from './hooks/useWebSerial';
import { useSavedModels } from './hooks/useSavedModels';
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

  // Handle voice button press
  const handleVoicePress = useCallback(() => {
    if (appState !== 'idle' && appState !== 'ready' && appState !== 'done') return;

    tripo.reset();
    setGcode(null);
    setPrintEstimate(null);
    speech.startListening();
    setAppState('listening');
  }, [appState, speech, tripo]);

  // Handle voice button release
  const handleVoiceRelease = useCallback(async () => {
    speech.stopListening();

    // Wait a bit for final transcript
    await new Promise(resolve => setTimeout(resolve, 500));

    if (speech.transcript) {
      setAppState('generating');

      // If we already have a model, combine prompts for refining
      let finalPrompt: string;
      if (currentPrompt && tripo.modelUrl) {
        // Refining: combine "кошка" + "с косичкой" → "кошка с косичкой"
        finalPrompt = `${currentPrompt}, ${speech.transcript}`;
        console.log('🔄 Refining prompt:', finalPrompt);
      } else {
        // New generation
        finalPrompt = speech.transcript;
      }

      // Save the base prompt (without modifiers)
      setCurrentPrompt(finalPrompt);

      // Enrich prompt with safety modifiers
      const enrichedPrompt = enrichPrompt(finalPrompt);

      // Generate 3D model - use returned URL directly
      const modelUrl = await tripo.generate(enrichedPrompt);

      if (modelUrl) {
        setAppState('ready');

        // For MVP, we'll use a placeholder G-code
        // Full Kiri:Moto integration would go here
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
  }, [speech, tripo, currentPrompt]);

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
        <button className="lang-toggle" onClick={toggleLanguage}>
          {i18n.language === 'ru' ? '🇬🇧 EN' : '🇷🇺 RU'}
        </button>
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
              onClick={handleVoicePress}
              title="Добавить детали голосом"
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
            tripo.reset();
            setCurrentPrompt(model.prompt);
            // We can't restore modelUrl directly to tripo hook,
            // so we'll need a different approach - regenerate or just show
            // For now, just set prompt and let user regenerate if needed
            setAppState('idle');
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
