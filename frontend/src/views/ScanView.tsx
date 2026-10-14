import React, { useState } from 'react';
import { CameraCapture } from '../components/CameraCapture';
import { runLocalOcr, OcrProgress } from '../services/ocr';
import { api } from '../services/api';
import { Product, AnalyzeLabelResponse } from '../types';
import { useLanguage } from '../i18n';
import { Scan, FileText, CheckCircle, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';

interface ScanViewProps {
  onAnalysisComplete: (result: AnalyzeLabelResponse) => void;
  onNavigate: (view: string) => void;
}

const SAMPLE_OCR_PRESETS = [
  {
    name: "🍪 Choco-Oat Cookies Label",
    text: `GRAINBAKES NUTRCRUNCH CHOCO-OAT COOKIES
Net Wt: 150g
MRP Rs. 45.00 (Incl. of all taxes)
Pkg Dt: 15/08/2026
Best Before 6 months from packaging
NUTRITIONAL INFORMATION Per 100g:
Energy 480 kcal
Protein 7.5 g
Carbohydrate 66.0 g
Total Sugars 24.5 g
Added Sugars 22.0 g
Total Fat 21.0 g
Saturated Fat 9.8 g
Trans Fat 0 g
Dietary Fibre 5.2 g
Sodium 280 mg
INGREDIENTS: Rolled Oats (32%), Refined Wheat Flour (Maida) (24%), Sugar, Edible Vegetable Oil (Palm Oil), Chocolate Chips (10%), Raising Agents [INS 500(ii), INS 503(ii)], Emulsifier (INS 322(i)).
Allergen Advice: Contains Wheat, Oats, and Soy. May contain Milk and Tree Nuts.
Mfd by GrainBakes Confectionery Pvt Ltd, Pune 411028. Country of Origin: India. Feedback: care@grainbakes.com`
  },
  {
    name: "🧃 100% Mixed Fruit Juice Label",
    text: `GOLDEN ORCHARD 100% MIXED FRUIT JUICE
Net Volume: 1000 ml (1 Litre)
MRP: Rs 130.00 (Incl. of all taxes)
Mfg Date: 01/09/2026
Best Before 6 months from manufacture
NUTRITION FACTS (Typical values per 100 ml):
Energy: 54 kcal
Protein: 0.4 g
Carbohydrate: 13.2 g
Total Natural Sugars: 12.5 g
Added Sugars: 0.0 g
Total Fat: 0.1 g
Saturated Fat: 0.0 g
Dietary Fibre: 0.6 g
Sodium: 12 mg
INGREDIENTS: Water, Mixed Fruit Juice Concentrate (38%) [Apple, Orange, Guava, Mango], Acidity Regulator (INS 330), Antioxidant (INS 300).
Mfd by Golden Orchard Beverages Ltd, Surat 394230. Country of Origin: India. Care: support@goldenorchard.in`
  },
  {
    name: "🥜 Peanut Protein Bar Label",
    text: `POWERPULSE ROASTED PEANUT & SOYA CRISP BAR
Net Qty: 50 g
MRP Rs. 35.00 (All Incl.)
Pkg: 10/09/2026  EXP: 10/01/2027
Best Before 4 months from packing
NUTRITIONAL FACTS per 100g:
Energy 520 kcal
Protein 24.0 g
Carbohydrate 42.0 g
Total Sugars 18.0 g
Added Sugar 14.0 g
Total Fat 28.0 g
Saturated Fat 6.2 g
Dietary Fiber 7.8 g
Sodium 190 mg
INGREDIENTS: Roasted Peanuts (44%), Soy Protein Crisps (18%), Jaggery, Liquid Glucose, Honey, Whey Protein Concentrate (8%), Stabilizer (INS 412).
Allergen Info: Contains Peanuts, Soy, and Milk. May contain Sesame.
Manufactured by PowerPulse Health Labs, Bengaluru 560100. Consumer Care: hello@powerpulse.fit`
  }
];

export const ScanView: React.FC<ScanViewProps> = ({ onAnalysisComplete, onNavigate }) => {
  const { language, t } = useLanguage();
  const [images, setImages] = useState<{ file?: File; dataUrl: string; name: string }[]>([]);
  const [rawOcrText, setRawOcrText] = useState<string>('');
  const [isOcrRunning, setIsOcrRunning] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Trigger OCR on attached images
  const handleRunOcr = async () => {
    if (images.length === 0) {
      setErrorMessage('Please capture or upload at least one package image first.');
      return;
    }
    setErrorMessage(null);
    setIsOcrRunning(true);
    setOcrProgress({ status: 'Running local OCR engine...', progress: 0.2 });

    try {
      // Convert any dataUrls without a file object to File blobs
      const fileObjects: File[] = [];
      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        if (item.file) {
          fileObjects.push(item.file);
        } else {
          const resp = await fetch(item.dataUrl);
          const blob = await resp.blob();
          fileObjects.push(new File([blob], item.name, { type: 'image/jpeg' }));
        }
      }

      setOcrProgress({ status: 'Recognizing text & reconstructing table rows...', progress: 0.5 });
      try {
        const scanRes = await api.scanImages(fileObjects, language);
        setRawOcrText(scanRes.raw_ocr_text);
        setOcrProgress({ status: 'Local OCR completed successfully!', progress: 1.0 });
        setIsOcrRunning(false);
        return;
      } catch (backendErr: any) {
        console.warn('Backend OCR call failed, trying browser Tesseract fallback:', backendErr);
      }

      // Browser Tesseract.js fallback
      let aggregatedText = '';
      for (let i = 0; i < images.length; i++) {
        setOcrProgress({
          status: `Processing image ${i + 1} of ${images.length}...`,
          progress: 0.5 + (i / images.length) * 0.4,
        });
        const text = await runLocalOcr(images[i].dataUrl, (p) => {
          setOcrProgress({
            status: `Image ${i + 1}/${images.length}: ${p.status}`,
            progress: 0.5 + (i / images.length) * 0.4 + (p.progress / images.length) * 0.4,
          });
        });
        aggregatedText += `\n--- Image ${i + 1}: ${images[i].name} ---\n` + text + '\n';
      }

      setRawOcrText(aggregatedText.trim());
      setOcrProgress({ status: 'Local OCR completed successfully!', progress: 1.0 });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'OCR failed. You can paste or type the label text manually below.');
    } finally {
      setIsOcrRunning(false);
    }
  };

  // Submit recognized/edited text to backend parser
  const handleAnalyze = async () => {
    if (!rawOcrText.trim()) {
      setErrorMessage('Label text is empty. Run OCR or type/paste the package text first.');
      return;
    }

    setErrorMessage(null);
    setIsAnalyzing(true);

    try {
      const response = await api.analyzeLabel(rawOcrText, language);
      onAnalysisComplete(response);
    } catch (err: any) {
      console.warn('Backend API call failed, falling back to local client parsing:', err);
      // Fallback: If backend is offline, construct a baseline product response
      const fallbackResult: AnalyzeLabelResponse = {
        product: {
          id: 'local-scan-' + Date.now(),
          name: rawOcrText.split('\n')[0]?.trim() || 'Scanned Product',
          raw_ocr_text: rawOcrText,
          allergens_detected: [],
          data_source: 'Local Client Fallback',
        },
        evidences: [],
        allergens_detected: [],
        ingredients_explained: [],
        declarations_checklist: [],
        raw_ocr_text: rawOcrText,
        overall_confidence: 'Uncertain',
        warnings: ['Backend offline: basic structure loaded locally.'],
      };
      onAnalysisComplete(fallbackResult);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyPreset = (text: string) => {
    setRawOcrText(text.trim());
    setErrorMessage(null);
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.35rem' }}>
          {t.navScan}
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Scan package label with your camera or upload front & back photos. All OCR and calculations run locally without generative AI.
        </p>
      </div>

      {/* Step 1: Camera or Upload */}
      <div style={{ marginBottom: '1.5rem' }}>
        <CameraCapture
          onImagesReady={(imgs) => setImages(imgs)}
          isProcessing={isOcrRunning}
        />
      </div>

      {/* OCR Action & Progress Bar */}
      {images.length > 0 && (
        <div className="glass-card" style={{ marginBottom: '1.5rem', background: 'rgba(15, 23, 42, 0.7)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Step 2: Run Browser-Side OCR</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Extract text locally on your device without sending photos to cloud AI.
              </p>
            </div>

            <button
              onClick={handleRunOcr}
              disabled={isOcrRunning}
              className="btn btn-primary"
            >
              {isOcrRunning ? (
                <>
                  <RefreshCw size={16} className="pulse-glow" />
                  Reading Text...
                </>
              ) : (
                <>
                  <Scan size={16} />
                  Run Local OCR ({images.length} image{images.length > 1 ? 's' : ''})
                </>
              )}
            </button>
          </div>

          {ocrProgress && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                <span>{ocrProgress.status}</span>
                <span>{Math.round(ocrProgress.progress * 100)}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, Math.round(ocrProgress.progress * 100))}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Testing Presets for Tech Expo */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Sparkles size={16} color="var(--accent-amber)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
            Tech Expo Fast-Track: Try Sample Pack Labels
          </span>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          Test full parsing, portion math, and allergen detection instantly without camera:
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {SAMPLE_OCR_PRESETS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyPreset(p.text)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Step 3: Verified Extracted Text Area */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} color="var(--accent-emerald)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
              Recognized Label Text (Review & Edit)
            </h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Editable before final analysis
          </span>
        </div>

        <textarea
          rows={9}
          value={rawOcrText}
          onChange={(e) => setRawOcrText(e.target.value)}
          placeholder="Extracted OCR text will appear here. You can also paste packaging text or type manually if OCR had glare or lighting issues..."
          className="form-textarea"
          style={{ width: '100%', fontSize: '0.85rem', lineHeight: 1.5 }}
        />

        {errorMessage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', color: '#fda4af', fontSize: '0.8rem' }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', gap: '0.75rem' }}>
          <button
            onClick={() => setRawOcrText('')}
            disabled={!rawOcrText}
            className="btn btn-secondary"
          >
            Clear Text
          </button>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !rawOcrText.trim()}
            className="btn btn-primary"
            style={{ padding: '0.7rem 1.5rem' }}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw size={16} className="pulse-glow" />
                Analyzing Product...
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                Analyze Label & View Nutrition
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
