import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  Bookmark,
  Edit3,
  X,
  Scan,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { Product, AnalyzeLabelResponse } from '../types';
import { api } from '../services/api';
import { EvidenceBadge } from './EvidenceBadge';

export interface ProductSlotProps {
  slotId: 'A' | 'B';
  slotTitle: string; // e.g. "Product A — Primary Product"
  accentColor: string; // emerald or cyan/sky
  currentProduct: Product | null;
  onProductChange: (product: Product | null) => void;
  savedProductsList: Product[];
}

export const ProductSlotInput: React.FC<ProductSlotProps> = ({
  slotId,
  slotTitle,
  accentColor,
  currentProduct,
  onProductChange,
  savedProductsList,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'saved' | 'manual'>('upload');

  // File Upload State
  const [images, setImages] = useState<{ file: File; dataUrl: string; name: string }[]>([]);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isOcrRunning, setIsOcrRunning] = useState<boolean>(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Manual Edit / Review State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [manualForm, setManualForm] = useState<Partial<Product>>({
    name: `Product ${slotId}`,
    mrp: 40.0,
    net_quantity_value: 100.0,
    net_quantity_unit: 'g',
    energy_kcal: 400.0,
    protein_g: 8.0,
    total_sugar_g: 20.0,
    total_fat_g: 15.0,
    saturated_fat_g: 6.0,
    sodium_mg: 250.0,
    nutrition_basis: 'per 100g',
  });

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Stop camera on unmount or tab switch / page hidden
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

  const startCamera = async () => {
    setCameraError(null);

    // 1. Check for secure context
    if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setCameraError('Camera access requires HTTPS in production. Please use file upload or switch to HTTPS.');
      return;
    }

    // 2. Check for browser mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported by your browser. Please use the image upload option.');
      return;
    }

    if (streamRef.current) {
      stopCamera();
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
      } catch (constraintErr: any) {
        if (constraintErr.name === 'OverconstrainedError' || constraintErr.name === 'ConstraintNotSatisfiedError') {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw constraintErr;
        }
      }

      streamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.warn);
      }
    } catch (err: any) {
      console.warn(`Camera access failed for Slot ${slotId}:`, err);
      stopCamera();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera permissions in browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. Please connect a camera or use file upload.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Camera is already in use by another application. Please close other camera apps and retry.');
      } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        setCameraError('The requested camera settings could not be satisfied. Please use file upload.');
      } else if (err.name === 'SecurityError') {
        setCameraError('Camera access requires HTTPS in production. Please use file upload.');
      } else {
        setCameraError(err.message || 'Camera access not granted or not available. Please use image upload.');
      }
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
      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], `Slot-${slotId}-Capture-${images.length + 1}.jpg`, { type: 'image/jpeg' });
        const reader = new FileReader();
        reader.onload = () => {
          const newImg = {
            file,
            dataUrl: reader.result as string,
            name: file.name,
          };
          setImages((prev) => [...prev, newImg]);
        };
        reader.readAsDataURL(file);
      }, 'image/jpeg', 0.92);
    }
  };

  // Drag and Drop & File Upload handlers
  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setOcrError(null);

    const validFiles: { file: File; dataUrl: string; name: string }[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setOcrError(`File '${file.name}' is not an image.`);
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setOcrError(`File '${file.name}' exceeds 15MB size limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        validFiles.push({
          file,
          dataUrl: reader.result as string,
          name: file.name,
        });
        if (validFiles.length === files.length) {
          setImages((prev) => [...prev, ...validFiles]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFilesAdded(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Run Backend OCR on Uploaded Images
  const handleRunOcr = async () => {
    if (images.length === 0) {
      setOcrError('Please attach or capture at least one package image first.');
      return;
    }

    setOcrError(null);
    setIsOcrRunning(true);

    try {
      const fileObjects = images.map((img) => img.file);
      const res: AnalyzeLabelResponse = await api.scanImages(fileObjects);
      onProductChange(res.product);
      setManualForm({ ...res.product });
    } catch (err: any) {
      console.error(`OCR error on Slot ${slotId}:`, err);
      setOcrError(err.message || 'OCR processing failed. You can enter details manually.');
    } finally {
      setIsOcrRunning(false);
    }
  };

  // Saved / Demo Product selection
  const handleSelectSaved = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    if (!pId) {
      onProductChange(null);
      return;
    }
    const found = savedProductsList.find((p) => p.id === pId);
    if (found) {
      onProductChange(found);
      setManualForm({ ...found });
    }
  };

  // Save manual / edited form
  const handleSaveManualForm = () => {
    const updatedProd: Product = {
      id: currentProduct?.id || `manual-${slotId}-${Date.now()}`,
      name: manualForm.name || `Product ${slotId}`,
      mrp: manualForm.mrp,
      currency: 'INR',
      net_quantity_value: manualForm.net_quantity_value,
      net_quantity_unit: manualForm.net_quantity_unit || 'g',
      energy_kcal: manualForm.energy_kcal,
      protein_g: manualForm.protein_g,
      carbohydrates_g: manualForm.carbohydrates_g,
      total_sugar_g: manualForm.total_sugar_g,
      total_fat_g: manualForm.total_fat_g,
      saturated_fat_g: manualForm.saturated_fat_g,
      sodium_mg: manualForm.sodium_mg,
      fibre_g: manualForm.fibre_g,
      serving_size: manualForm.serving_size || 30.0,
      serving_unit: manualForm.net_quantity_unit || 'g',
      nutrition_basis: manualForm.nutrition_basis || 'per 100g',
      allergens_detected: currentProduct?.allergens_detected || [],
      allergen_statement: manualForm.allergen_statement,
      data_source: 'Manually Entered / Verified',
    };
    onProductChange(updatedProd);
    setIsEditing(false);
  };

  return (
    <div
      className="glass-card"
      style={{
        borderTop: `4px solid ${accentColor}`,
        background: 'rgba(17, 24, 39, 0.85)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      {/* Slot Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: accentColor,
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {slotId}
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {slotTitle}
          </h3>
        </div>

        {currentProduct && (
          <span className="badge badge-source" style={{ fontSize: '0.72rem' }}>
            Ready for Comparison
          </span>
        )}
      </div>

      {/* Mode / Method Selector Tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-surface)', padding: '0.3rem', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
        <button
          onClick={() => {
            setActiveTab('upload');
            stopCamera();
          }}
          className={`btn btn-sm ${activeTab === 'upload' ? 'btn-primary' : ''}`}
          style={{
            flex: 1,
            fontSize: '0.78rem',
            padding: '0.4rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            whiteSpace: 'nowrap',
          }}
        >
          <Upload size={14} />
          Upload Label
        </button>

        <button
          onClick={() => {
            setActiveTab('camera');
            stopCamera();
          }}
          className={`btn btn-sm ${activeTab === 'camera' ? 'btn-primary' : ''}`}
          style={{
            flex: 1,
            fontSize: '0.78rem',
            padding: '0.4rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            whiteSpace: 'nowrap',
          }}
        >
          <Camera size={14} />
          Camera Scan
        </button>

        <button
          onClick={() => {
            setActiveTab('saved');
            stopCamera();
          }}
          className={`btn btn-sm ${activeTab === 'saved' ? 'btn-primary' : ''}`}
          style={{
            flex: 1,
            fontSize: '0.78rem',
            padding: '0.4rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            whiteSpace: 'nowrap',
          }}
        >
          <Bookmark size={14} />
          Saved / Demo
        </button>

        <button
          onClick={() => {
            setActiveTab('manual');
            stopCamera();
            setIsEditing(true);
          }}
          className={`btn btn-sm ${activeTab === 'manual' ? 'btn-primary' : ''}`}
          style={{
            flex: 1,
            fontSize: '0.78rem',
            padding: '0.4rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            whiteSpace: 'nowrap',
          }}
        >
          <Edit3 size={14} />
          Manual
        </button>
      </div>

      {/* TAB 1: Image Upload (Drag & Drop + Multiple Photos) */}
      {activeTab === 'upload' && (
        <div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragOver ? accentColor : 'var(--border-card)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem 1rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragOver ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-input)',
              transition: 'all 0.2s ease',
            }}
          >
            <Upload size={28} color={accentColor} style={{ margin: '0 auto 0.5rem auto' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Click or drag package label images here
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Upload front of pack, nutrition panel, and ingredients (JPG, PNG, up to 15MB)
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFilesAdded(e.target.files)}
              style={{ display: 'none' }}
            />
          </div>

          {/* Attached Image Thumbnails */}
          {images.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {images.length} Image{images.length > 1 ? 's' : ''} Attached for Product {slotId}:
                </span>
                <button
                  onClick={() => setImages([])}
                  style={{ fontSize: '0.7rem', color: '#fda4af' }}
                >
                  Clear all
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      aspectRatio: '1',
                      border: '1px solid var(--border-subtle)',
                      background: '#000',
                    }}
                  >
                    <img src={img.dataUrl} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      onClick={() => removeImage(idx)}
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        background: 'rgba(0,0,0,0.75)',
                        color: '#fff',
                        borderRadius: '50%',
                        width: 18,
                        height: 18,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleRunOcr}
                disabled={isOcrRunning}
                className="btn btn-primary btn-sm"
                style={{ width: '100%', padding: '0.55rem' }}
              >
                {isOcrRunning ? (
                  <>
                    <RefreshCw size={15} className="pulse-glow" />
                    Running Local OCR on Product {slotId}...
                  </>
                ) : (
                  <>
                    <Scan size={15} />
                    Extract Product {slotId} Data ({images.length} Image{images.length > 1 ? 's' : ''})
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Camera Scan */}
      {activeTab === 'camera' && (
        <div>
          {isCameraActive ? (
            <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000', marginBottom: '0.75rem' }}>
              <video
                ref={setVideoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', maxHeight: '240px', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '0.5rem',
                  left: 0,
                  right: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '0.75rem',
                }}
              >
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="btn btn-primary btn-sm"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    padding: 0,
                  }}
                  title="Capture Photo"
                >
                  <Camera size={20} />
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                >
                  Stop
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <button type="button" onClick={startCamera} className="btn btn-secondary btn-sm">
                <Camera size={16} />
                Start Camera for Product {slotId}
              </button>
            </div>
          )}

          {cameraError && (
            <div style={{ fontSize: '0.78rem', color: 'var(--color-warning)', marginTop: '0.4rem' }}>
              ⚠️ {cameraError}
            </div>
          )}

          {images.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                {images.length} Camera Snapshot{images.length > 1 ? 's' : ''} Captured:
              </div>
              <button
                onClick={handleRunOcr}
                disabled={isOcrRunning}
                className="btn btn-primary btn-sm"
                style={{ width: '100%' }}
              >
                {isOcrRunning ? 'Running OCR...' : `Extract Product ${slotId} Data`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Saved / Demo Dropdown */}
      {activeTab === 'saved' && (
        <div>
          <label className="form-label" style={{ fontSize: '0.78rem' }}>
            Choose from Saved Scans or Tech Expo Demo Packs:
          </label>
          <select
            value={currentProduct?.id || ''}
            onChange={handleSelectSaved}
            className="form-select"
            style={{ fontSize: '0.85rem' }}
          >
            <option value="">-- Select a Product for Slot {slotId} --</option>
            {savedProductsList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.is_demo ? '🌟 [Demo] ' : '💾 '} {p.name} ({p.net_quantity_value}{p.net_quantity_unit || 'g'} - ₹{p.mrp})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Error Message */}
      {ocrError && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', color: '#fda4af', fontSize: '0.78rem' }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>{ocrError}</div>
        </div>
      )}

      {/* TAB 4 or EDIT MODE: Manual Product Data Form */}
      {(activeTab === 'manual' || isEditing) && (
        <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: accentColor }}>
              Review & Edit Product {slotId} Values:
            </span>
            <button
              onClick={() => setIsEditing(false)}
              style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Product Name</label>
              <input
                type="text"
                value={manualForm.name || ''}
                onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                className="form-input"
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>MRP (₹)</label>
                <input
                  type="number"
                  step="0.5"
                  value={manualForm.mrp || ''}
                  onChange={(e) => setManualForm({ ...manualForm, mrp: parseFloat(e.target.value) || undefined })}
                  className="form-input"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Net Quantity</label>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <input
                    type="number"
                    value={manualForm.net_quantity_value || ''}
                    onChange={(e) => setManualForm({ ...manualForm, net_quantity_value: parseFloat(e.target.value) || undefined })}
                    className="form-input"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem', flex: 1 }}
                  />
                  <select
                    value={manualForm.net_quantity_unit || 'g'}
                    onChange={(e) => setManualForm({ ...manualForm, net_quantity_unit: e.target.value })}
                    className="form-select"
                    style={{ padding: '0.4rem', fontSize: '0.82rem', width: '55px' }}
                  >
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Energy (kcal / 100g)</label>
                <input
                  type="number"
                  value={manualForm.energy_kcal || ''}
                  onChange={(e) => setManualForm({ ...manualForm, energy_kcal: parseFloat(e.target.value) || undefined })}
                  className="form-input"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Protein (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={manualForm.protein_g ?? ''}
                  onChange={(e) => setManualForm({ ...manualForm, protein_g: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                  className="form-input"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Carbs (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={manualForm.carbohydrates_g ?? ''}
                  onChange={(e) => setManualForm({ ...manualForm, carbohydrates_g: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                  className="form-input"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Sugars (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={manualForm.total_sugar_g ?? ''}
                  onChange={(e) => setManualForm({ ...manualForm, total_sugar_g: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                  className="form-input"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Total Fat (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={manualForm.total_fat_g ?? ''}
                  onChange={(e) => setManualForm({ ...manualForm, total_fat_g: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                  className="form-input"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <button
              onClick={handleSaveManualForm}
              className="btn btn-primary btn-sm"
              style={{ marginTop: '0.5rem', width: '100%' }}
            >
              <Check size={14} />
              Confirm Product {slotId} Information
            </button>
          </div>
        </div>
      )}

      {/* EXTRACTED PRODUCT CARD (SUMMARY) */}
      {currentProduct && !isEditing && (
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem',
            border: `1px solid ${accentColor}40`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
            <div>
              <span className="badge badge-source" style={{ fontSize: '0.65rem', marginBottom: '0.2rem' }}>
                {currentProduct.category || 'Commodity'}
              </span>
              <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>{currentProduct.name}</h4>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                MRP: <strong>₹{currentProduct.mrp?.toFixed(2) || 'N/A'}</strong> | Net:{' '}
                <strong>{currentProduct.net_quantity_value || 'N/A'}{currentProduct.net_quantity_unit || 'g'}</strong>
              </div>
            </div>

            <button
              onClick={() => {
                setManualForm({ ...currentProduct });
                setIsEditing(true);
              }}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
            >
              <Edit3 size={13} />
              Edit
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginTop: '0.5rem', fontSize: '0.75rem', textAlign: 'center' }}>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.35rem', borderRadius: '4px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>Energy</div>
              <strong style={{ color: '#f59e0b' }}>{currentProduct.energy_kcal !== undefined ? `${currentProduct.energy_kcal} kcal` : 'N/A'}</strong>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.35rem', borderRadius: '4px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>Protein</div>
              <strong style={{ color: '#38bdf8' }}>{currentProduct.protein_g !== undefined ? `${currentProduct.protein_g}g` : 'N/A'}</strong>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.35rem', borderRadius: '4px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>Sugar</div>
              <strong style={{ color: '#fcd34d' }}>{currentProduct.total_sugar_g !== undefined ? `${currentProduct.total_sugar_g}g` : 'N/A'}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
