import { createWorker } from 'tesseract.js';

export interface OcrProgress {
  status: string;
  progress: number;
}

// Singleton worker cache for browser-side OCR
let _workerPromise: Promise<any> | null = null;

async function getOrCreateWorker(): Promise<any> {
  if (!_workerPromise) {
    _workerPromise = createWorker('eng', 1);
  }
  return _workerPromise;
}

export async function runLocalOcr(
  imageSource: string | File,
  onProgress?: (p: OcrProgress) => void
): Promise<string> {
  onProgress?.({ status: 'Initializing OCR engine...', progress: 0.1 });

  try {
    const worker = await getOrCreateWorker();
    
    // Attach progress callback for current recognition run
    if (onProgress) {
      worker.setParameters({}); // keeps worker healthy
    }

    onProgress?.({ status: 'Reading package text...', progress: 0.3 });
    const ret = await worker.recognize(imageSource);

    onProgress?.({ status: 'Processing text...', progress: 1.0 });
    return ret.data.text;
  } catch (err: any) {
    _workerPromise = null; // Reset on failure to allow clean re-init
    console.error('Local Tesseract OCR error:', err);
    throw new Error(`OCR processing error: ${err.message || 'Could not recognize text from image'}`);
  }
}
