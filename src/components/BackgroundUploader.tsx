import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface BackgroundUploaderProps {
  backgrounds: HTMLImageElement[];
  currentIndex: number;
  onUpload: (file: File) => void;
  onRemove: (index: number) => void;
  onClearAll: () => void;
  maxImages?: number;
}

export function BackgroundUploader({ 
  backgrounds, 
  currentIndex, 
  onUpload, 
  onRemove, 
  onClearAll,
  maxImages = 20 
}: BackgroundUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onUpload(file);
      // 重置 input 值，允许再次上传相同文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-emerald-400">
          Hintergründe ({backgrounds.length}/{maxImages})
        </label>
        {backgrounds.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Alle löschen
          </button>
        )}
      </div>

      {backgrounds.length > 0 && (
        <div className="grid grid-cols-5 gap-2 mb-3">
          {backgrounds.map((bg, index) => (
            <div 
              key={index} 
              className={`relative group rounded-lg overflow-hidden border-2 ${
                index === currentIndex 
                  ? 'border-emerald-500 shadow-lg shadow-emerald-500/50' 
                  : 'border-slate-700/50'
              }`}
            >
              <img 
                src={bg.src} 
                alt={`Hintergrund ${index + 1}`} 
                className="w-full h-16 object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex items-center justify-center">
                <button
                  onClick={() => onRemove(index)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-red-600 rounded-full hover:bg-red-500"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
              {index === currentIndex && (
                <div className="absolute top-1 left-1 bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded">
                  Aktiv
                </div>
              )}
              <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={backgrounds.length >= maxImages}
        className={`w-full px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm transition-all ${
          backgrounds.length >= maxImages
            ? 'bg-slate-700/30 text-slate-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500'
        }`}
      >
        <Upload className="w-4 h-4" />
        {backgrounds.length === 0 ? 'Hintergrund hochladen' : 'Weiteren hinzufügen'}
      </button>

      {backgrounds.length > 0 && (
        <p className="text-xs text-slate-400 mt-2">
          🎨 Der Hintergrund wechselt automatisch beim Fressen von Futter
        </p>
      )}

      {backgrounds.length >= maxImages && (
        <p className="text-xs text-amber-400 mt-2">
          ⚠️ Maximum von {maxImages} Hintergründen erreicht
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
