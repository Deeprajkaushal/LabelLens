import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping camera track:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Stop all camera media tracks when component unmounts or user switches away/tabs
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopCamera();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopCamera();
    };
  }, [stopCamera]);

  // Video element callback ref to attach stream directly upon element mounting
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch((err) => {
        console.warn('Camera video playback error:', err);
      });
    }
  }, []);

  const handleCameraError = (err: any) => {
    console.warn('Camera access error:', err);
    stopCamera();
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      setCameraError('Camera permission was denied. Please allow camera permissions in your browser settings to scan products.');
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      setCameraError('No camera device found on this system. Please connect a camera or use the image upload option.');
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      setCameraError('Camera is already in use by another application or tab. Please close other camera apps and retry.');
    } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
      setCameraError('The requested camera settings could not be satisfied by your device. Please use file upload.');
    } else if (err.name === 'SecurityError') {
      setCameraError('Camera access requires HTTPS in production. Please access this application via HTTPS.');
    } else {
      setCameraError(err.message || 'Unable to access device camera. Please check browser permissions or use file upload.');
    }
  };

  const startCamera = async () => {
    setCameraError(null);

    // 1. Check for secure context (HTTPS required in production, localhost allowed in dev)
    if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setCameraError('Camera access requires a secure connection (HTTPS). Please ensure you are accessing this application over HTTPS.');
      return;
    }

    // 2. Check for browser mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your browser or environment. Please use file upload below.');
      return;
    }

    // Stop existing stream if active
    if (streamRef.current) {
      stopCamera();
    }

    try {
      let stream: MediaStream;
      try {
        // Request mobile rear camera using facingMode: "environment" with ideal fallback
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (constraintErr: any) {
        if (constraintErr.name === 'OverconstrainedError' || constraintErr.name === 'ConstraintNotSatisfiedError') {
          // Fallback to basic camera constraints if environment rear camera is not available
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw constraintErr;
        }
      }

      streamRef.current = stream;
      setIsCameraActive(true);

      // If video ref is already in DOM, bind immediately
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((playErr) => {
          console.warn('Camera video play failed:', playErr);
        });
      }
    } catch (err: any) {
      handleCameraError(err);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    if (width === 0 || height === 0) {
      setCameraError('Camera stream is still initializing. Please wait a moment and try capturing again.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

      canvas.toBlob((blob) => {
        const fileName = `Camera-Snap-${Date.now()}-${images.length + 1}.jpg`;
        const file = blob ? new File([blob], fileName, { type: 'image/jpeg' }) : undefined;
        const newImg = {
          file,
          dataUrl,
          name: fileName,
        };
        const updated = [...images, newImg];
        setImages(updated);
        onImagesReady(updated);
      }, 'image/jpeg', 0.92);
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
            ref={setVideoRef}
            autoPlay
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
              type="button"
              onClick={capturePhoto}
              className="btn btn-primary"
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                padding: 0,
              }}
              title="Capture Photo"
            >
              <Camera size={26} />
            </button>
            <button
              type="button"
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
        <div style={{ background: 'rgba(185, 130, 53, 0.1)', border: '1px solid rgba(185, 130, 53, 0.25)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', color: 'var(--color-warning)', fontSize: '0.8rem', marginBottom: '1rem' }}>
          ⚠️ {cameraError}
        </div>
      )}

      {/* Action Buttons: Camera toggle & File upload */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {!isCameraActive && (
          <button
            type="button"
            onClick={startCamera}
            disabled={isProcessing}
            className="btn btn-secondary"
            style={{ flex: 1, minWidth: '150px' }}
          >
            <Camera size={18} color="var(--primary)" />
            Open Device Camera
          </button>
        )}

        <button
          type="button"
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
                  background: 'var(--bg-surface)',
                  aspectRatio: '1',
                }}
              >
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  disabled={isProcessing}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: 'rgba(41, 45, 50, 0.75)',
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
                    background: 'rgba(41, 45, 50, 0.75)',
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
