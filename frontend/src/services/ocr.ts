import { createWorker } from 'tesseract.js';

export interface OcrProgress {
  status: string;
  progress: number;
}

export async function runLocalOcr(
  imageSource: string | File,
  onProgress?: (p: OcrProgress) => void
): Promise<string> {
  onProgress?.({ status: 'Initializing OCR engine...', progress: 0.1 });

  try {
    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          onProgress?.({
            status: `Reading package text (${Math.round(m.progress * 100)}%)...`,
            progress: 0.2 + m.progress * 0.75,
          });
        } else {
          onProgress?.({
            status: m.status,
            progress: 0.15,
          });
        }
      },
    });

    const ret = await worker.recognize(imageSource);
    await worker.terminate();

    onProgress?.({ status: 'Processing text...', progress: 1.0 });
    return ret.data.text;
  } catch (err: any) {
    console.error('Local Tesseract OCR error:', err);
    throw new Error(`OCR processing error: ${err.message || 'Could not recognize text from image'}`);
  }
}
