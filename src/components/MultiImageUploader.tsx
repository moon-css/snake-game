import React from 'react';
import { Upload, X } from 'lucide-react';

interface MultiImageUploaderProps {
  label: string;
  images: HTMLImageElement[];
  maxImages: number;
  onUpload: (file: File) => void;
  onClear: () => void;
}

export function MultiImageUploader({ 
  label, 
  images, 
  maxImages,
  onUpload, 
  onClear 
}: MultiImageUploaderProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onUpload(file);
    }
    e.target.value = '';
  };

  return (
    <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-slate-700/30">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-slate-300">
          {label} ({images.length}/{maxImages})
        </label>
        {images.length > 0 && (
          <button
            onClick={onClear}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {images.length > 0 && (
        <div className="grid grid-cols-5 gap-2 mb-3">
          {images.map((img, index) => (
            <div 
              key={index}
              className="relative w-full aspect-square rounded-lg overflow-hidden bg-slate-900/50 border border-slate-600/30"
            >
              <img 
                src={img.src} 
                alt={`${label} ${index + 1}`}
                className="w-full h-full object-contain"
              />
              <div className="absolute top-1 right-1 bg-slate-900/80 text-white text-xs px-1.5 py-0.5 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {images.length < maxImages && (
        <label className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700/30 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer border border-slate-600/30">
          <Upload className="w-4 h-4" />
          <span className="text-sm">
            {images.length === 0 ? 'Bild hochladen' : 'Weiteres Bild hochladen'}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      )}
      
      {images.length >= maxImages && (
        <div className="text-xs text-amber-400 bg-amber-900/20 rounded-lg p-2 border border-amber-500/20">
          ⚠️ Maximum erreicht ({maxImages} Bilder)
        </div>
      )}
    </div>
  );
}
