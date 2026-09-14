import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ImagePickerProps {
  currentImageUrl?: string | null;
  onImageSelected: (file: File | null) => void;
  onImageRemoved?: () => void;
  label?: string;
}

export const ImagePicker: React.FC<ImagePickerProps> = ({
  currentImageUrl,
  onImageSelected,
  onImageRemoved,
  label = 'Jewelry Photo',
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setPreviewUrl(currentImageUrl || null);
  }, [currentImageUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      onImageSelected(file);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onImageSelected(null);
    if (onImageRemoved) onImageRemoved();
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="w-full">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
        {label}
      </label>

      {/* Hidden inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {previewUrl ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group">
          <img
            src={previewUrl}
            alt="Jewelry Preview"
            className="w-full h-56 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end justify-between p-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="p-2 bg-white/90 backdrop-blur-sm text-slate-800 rounded-xl shadow-soft hover:bg-white text-xs font-medium flex items-center gap-1.5"
                title="Retake photo"
              >
                <Camera className="w-3.5 h-3.5" /> Retake
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-white/90 backdrop-blur-sm text-slate-800 rounded-xl shadow-soft hover:bg-white text-xs font-medium flex items-center gap-1.5"
                title="Choose another"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Replace
              </button>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 bg-rose-500/90 hover:bg-rose-600 text-white rounded-xl shadow-soft transition-colors"
              title="Delete photo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-200 hover:border-primary-400 bg-white rounded-2xl hover:bg-primary-50/40 transition-all text-slate-600 group active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 group-hover:bg-primary-100 flex items-center justify-center mb-2 transition-colors">
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Take Photo</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Using Camera</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-200 hover:border-primary-400 bg-white rounded-2xl hover:bg-primary-50/40 transition-all text-slate-600 group active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-slate-200 flex items-center justify-center mb-2 transition-colors">
              <ImageIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Upload Image</span>
            <span className="text-[10px] text-slate-400 mt-0.5">From Gallery</span>
          </button>
        </div>
      )}
    </div>
  );
};
