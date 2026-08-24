'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { db } from '@/db/dbClient';
import { Participant } from '@/db/types';
import { X, Upload, Camera, RotateCcw, Check, Trash2, ZoomIn, Crop } from 'lucide-react';
import Cropper, { Area } from 'react-easy-crop';

interface PlayerPhotoModalProps {
  participant: Participant;
  onClose: () => void;
  onSaved: (updated: Participant) => void;
}

type Mode = 'choose' | 'upload' | 'webcam' | 'crop';

const compressImage = (dataUrl: string, maxWidth = 300, maxHeight = 400): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions keeping aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      } else {
        resolve(dataUrl);
      }
    };
    img.src = dataUrl;
  });
};

export default function PlayerPhotoModal({ participant, onClose, onSaved }: PlayerPhotoModalProps) {
  const [mode, setMode] = useState<Mode>('choose');
  const [preview, setPreview] = useState<string | null>(participant.photo_url || null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  
  // Crop states
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch {
      setError('Camera access denied or not available. Please allow camera permission and try again.');
    }
  }, []);

  useEffect(() => {
    if (mode === 'webcam') startCamera();
    return () => stopCamera();
  }, [mode]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    setCaptured(rawDataUrl);
    setMode('crop');
    stopCamera();
  };

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const generateCroppedImage = async (): Promise<string | null> => {
    if (!captured || !croppedAreaPixels) return null;
    const image = new Image();
    image.src = captured;
    await new Promise(resolve => image.onload = resolve);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );

    // Compress the final cropped image
    return compressImage(canvas.toDataURL('image/jpeg', 0.9), 300, 400);
  };

  const handleCropAndSave = async () => {
    const croppedImage = await generateCroppedImage();
    if (croppedImage) {
      setCaptured(croppedImage);
      await saveImageToDb(croppedImage);
    }
  };

  const saveImageToDb = async (imgData: string) => {
    try {
      setSaving(true);
      setError(null);
      const updated = await db.participants.update(participant.id, { photo_url: imgData });
      onSaved(updated);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError('Failed to save photo: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const retake = () => {
    setCaptured(null);
    setPreview(participant.photo_url || null);
    startCamera();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB.'); return; }
    setError(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = ev.target?.result as string;
      setCaptured(result);
      setMode('crop');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!captured) return;
    await saveImageToDb(captured);
  };

  const handleRemove = async () => {
    if (!window.confirm('Remove current photo for this participant?')) return;
    try {
      setSaving(true);
      const updated = await db.participants.update(participant.id, { photo_url: '' });
      onSaved(updated);
      onClose();
    } catch {
      setError('Failed to remove photo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0e1118] border border-white/15 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Fighter Photo</h2>
            <p className="text-[10px] text-white/40 font-bold mt-0.5 truncate max-w-[260px]">{participant.full_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* ── Choose Mode ── */}
          {mode === 'choose' && (
            <>
              <div className="flex justify-center">
                <div className="relative w-36 h-44 rounded-xl overflow-hidden border-2 border-white/20 bg-black/40 shadow-xl group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}>
                  {preview
                    ? <img src={preview} alt={participant.full_name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex flex-col items-center justify-center text-white/20 gap-2">
                        <Camera className="h-10 w-10" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">No Photo</span>
                      </div>
                  }
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-[9px] font-black uppercase tracking-widest">Click to change</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMode('upload')}
                  className="flex flex-col items-center gap-2 py-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-blue-300 font-black text-xs uppercase tracking-widest transition cursor-pointer"
                >
                  <Upload className="h-5 w-5" />
                  From Device
                </button>
                <button
                  onClick={() => setMode('webcam')}
                  className="flex flex-col items-center gap-2 py-4 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-xl text-green-300 font-black text-xs uppercase tracking-widest transition cursor-pointer"
                >
                  <Camera className="h-5 w-5" />
                  Webcam
                </button>
              </div>

              {preview && (
                <button
                  onClick={handleRemove}
                  disabled={saving}
                  className="w-full py-2 flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-xs rounded-lg transition cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove Photo
                </button>
              )}
            </>
          )}

          {/* ── Upload from Device ── */}
          {mode === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {captured ? (
                <div className="flex justify-center">
                  <div className="w-36 h-44 rounded-xl overflow-hidden border-2 border-yellow-500/50 shadow-xl">
                    <img src={captured} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-12 border-2 border-dashed border-white/20 hover:border-blue-400/50 rounded-xl flex flex-col items-center gap-3 text-white/40 hover:text-blue-300 transition cursor-pointer"
                >
                  <Upload className="h-8 w-8" />
                  <span className="text-xs font-bold uppercase tracking-widest">Click to select image</span>
                  <span className="text-[9px] text-white/30">JPG, PNG, WEBP — Max 5MB</span>
                </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setMode('choose'); setCaptured(null); setPreview(participant.photo_url || null); }}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/60 font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  ← Back
                </button>
                {captured && (
                  <>
                    <button
                      onClick={() => { setCaptured(null); setPreview(participant.photo_url || null); fileInputRef.current?.click(); }}
                      className="py-2 px-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                      title="Change file"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-black text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {saving ? 'Saving…' : <><Check className="h-3.5 w-3.5" /> Save Photo</>}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Webcam Capture ── */}
          {mode === 'webcam' && (
            <div className="space-y-4">
              <canvas ref={canvasRef} className="hidden" />

              {!captured ? (
                <div className="relative rounded-xl overflow-hidden bg-black border border-white/10 aspect-video flex items-center justify-center min-h-[200px]">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white/40">
                      <div className="text-center space-y-2">
                        <Camera className="h-8 w-8 mx-auto animate-pulse" />
                        <span className="text-xs font-bold">Starting camera…</span>
                      </div>
                    </div>
                  )}
                  {cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-24 h-32 border-2 border-yellow-400/70 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.4)]" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="w-36 h-44 rounded-xl overflow-hidden border-2 border-green-500/60 shadow-xl">
                    <img src={captured} alt="Captured" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { stopCamera(); setMode('choose'); setCaptured(null); setPreview(participant.photo_url || null); }}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/60 font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  ← Cancel
                </button>
                <button
                  onClick={capturePhoto}
                  disabled={!cameraReady}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Camera className="h-3.5 w-3.5" /> Capture
                </button>
              </div>
            </div>
          )}

          {/* ── Crop Mode ── */}
          {mode === 'crop' && captured && (
            <div className="space-y-4">
              <div className="relative w-full h-[300px] bg-black rounded-xl overflow-hidden border border-white/20">
                <Cropper
                  image={captured}
                  crop={crop}
                  zoom={zoom}
                  aspect={3 / 4}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  cropShape="rect"
                  showGrid={true}
                />
              </div>
              <div className="flex items-center gap-2 px-2">
                <span className="text-[10px] text-white/50 font-bold">ZOOM</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setCaptured(null);
                    setMode('choose');
                    setPreview(participant.photo_url || null);
                  }}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/60 font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  Discard
                </button>
                <button
                  onClick={handleCropAndSave}
                  disabled={saving}
                  className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-black text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {saving ? 'Saving…' : <><Crop className="h-3.5 w-3.5" /> Crop & Save</>}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-[10px] text-red-400 font-bold text-center bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
