import React, { useRef } from 'react';
import { Upload, X } from 'lucide-react';

interface ImageUploaderProps {
  label: string;
  onUpload: (file: File) => void;
  onClear: () => void;
  hasImage: boolean;
  previewSrc?: string;
}

export function ImageUploader({ label, onUpload, onClear, hasImage, previewSrc }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onUpload(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
      <label className="block text-sm font-medium text-emerald-400 mb-2">{label}</label>
      <div className="flex items-center gap-3">
        {hasImage && previewSrc && (
          <div className="w-12 h-12 bg-slate-900/50 rounded-lg border border-slate-700/50 flex items-center justify-center overflow-hidden">
            <img src={previewSrc} alt={label} className="w-full h-full object-cover" />
          </div>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-500 hover:to-teal-500 transition-all flex items-center justify-center gap-2 text-sm"
        >
          <Upload className="w-4 h-4" />
          {hasImage ? 'Ändern' : 'Hochladen'}
        </button>
        {hasImage && (
          <button
            onClick={onClear}
            className="px-3 py-2 bg-red-600/80 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
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
