import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, RefreshCw, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '../i18n';

interface CameraCaptureProps {
  onImagesReady: (images: { file?: File; dataUrl: string; name: string }[]) => void;
  isProcessing?: boolean;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onImagesReady, isProcessing }) => {
  const { t } = useLanguage();
  const [images, setImages] = useState<{ file?: File; dataUrl: string; name: string }[]>([]);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera when unmounting
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera access not available or denied:', err);
      setCameraError('Camera access not granted or not available. Use file upload below.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const newImg = {
        dataUrl,
        name: `Camera-Snap-${images.length + 1}.jpg`,
      };
      const updated = [...images, newImg];
      setImages(updated);
      onImagesReady(updated);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: { file?: File; dataUrl: string; name: string }[] = [];
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        newItems.push({
          file,
          dataUrl: reader.result as string,
          name: file.name,
        });
        if (newItems.length === files.length) {
          const combined = [...images, ...newItems];
          setImages(combined);
          onImagesReady(combined);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const updated = images.filter((_, idx) => idx !== index);
    setImages(updated);
    onImagesReady(updated);
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Package Label Capture</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Upload front and back label photos to read nutrition, ingredients, and MRP.
          </p>
        </div>
      </div>

      {/* Live Camera View */}
      {isCameraActive && (
        <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000', marginBottom: '1rem' }}>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: '100%', maxHeight: '380px', objectFit: 'cover' }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '1rem',
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem',
            }}
          >
            <button
              onClick={capturePhoto}
              className="btn btn-primary"
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                padding: 0,
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.6)',
              }}
            >
              <Camera size={26} />
            </button>
            <button
              onClick={stopCamera}
              className="btn btn-secondary"
              style={{ borderRadius: 'var(--radius-full)', padding: '0.5rem 1rem' }}
            >
              Close Camera
            </button>
          </div>
        </div>
      )}

      {cameraError && (
        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', color: '#fcd34d', fontSize: '0.8rem', marginBottom: '1rem' }}>
          {cameraError}
        </div>
      )}

      {/* Action Buttons: Camera toggle & File upload */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {!isCameraActive && (
          <button
            onClick={startCamera}
            disabled={isProcessing}
            className="btn btn-secondary"
            style={{ flex: 1, minWidth: '150px' }}
          >
            <Camera size={18} color="var(--accent-emerald)" />
            Open Device Camera
          </button>
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="btn btn-primary"
          style={{ flex: 1, minWidth: '150px' }}
        >
          <Upload size={18} />
          Upload Image(s)
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </div>

      {/* Captured Image Thumbnails */}
      {images.length > 0 && (
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Attached Images ({images.length}) — Front, Back, or Side Panels:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.75rem' }}>
            {images.map((img, idx) => (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '1px solid var(--border-card)',
                  background: '#000',
                  aspectRatio: '1',
                }}
              >
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  onClick={() => removeImage(idx)}
                  disabled={isProcessing}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    borderRadius: '50%',
                    width: 22,
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Remove"
                >
                  <X size={14} />
                </button>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(0,0,0,0.6)',
                    fontSize: '0.65rem',
                    color: '#fff',
                    padding: '2px 4px',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {img.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
