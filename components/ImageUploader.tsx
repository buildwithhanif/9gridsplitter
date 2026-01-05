import React, { useCallback } from 'react';
import { Upload, ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (file: File) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected }) => {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImageSelected(e.dataTransfer.files[0]);
    }
  }, [onImageSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelected(e.target.files[0]);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="w-full max-w-xl mx-auto border-2 border-dashed border-slate-600 rounded-2xl p-12 text-center hover:border-blue-500 hover:bg-slate-800/50 transition-all cursor-pointer group animate-fade-in"
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
        <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <Upload className="w-8 h-8 text-blue-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Upload 3x3 Grid Image</h3>
        <p className="text-slate-400 text-sm mb-6">
          Drag & drop your Nine-Grid photo here,<br />or click to browse
        </p>
        <div className="flex gap-2 text-xs text-slate-500 bg-slate-800/80 py-2 px-4 rounded-full">
          <ImageIcon className="w-4 h-4" />
          <span>Supports JPG, PNG, WEBP</span>
        </div>
      </label>
    </div>
  );
};
