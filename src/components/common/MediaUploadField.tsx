import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Video, Trash2, RefreshCw, AlertCircle, Play } from 'lucide-react';

export interface MediaUploadFieldProps {
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  onChange: (url: string, type: 'image' | 'video') => void;
  onClear: () => void;
  label?: string;
  maxImageSizeMB?: number;
  maxVideoSizeMB?: number;
}

export const MediaUploadField: React.FC<MediaUploadFieldProps> = ({
  mediaUrl,
  mediaType = 'image',
  onChange,
  onClear,
  label = 'الوسائط (صورة أو فيديو من جهازك)',
  maxImageSizeMB = 5,
  maxVideoSizeMB = 30
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFile = (file: File, isVideo: boolean) => {
    setErrorMessage(null);

    // Validate type
    if (isVideo) {
      if (!file.type.startsWith('video/')) {
        setErrorMessage('الملف المختار ليس ملف فيديو صالح (mp4, webm, mov).');
        return;
      }
      if (file.size > maxVideoSizeMB * 1024 * 1024) {
        setErrorMessage(`حجم الفيديو كبير جداً (${(file.size / (1024 * 1024)).toFixed(1)} ميجابايت). الحد الأقصى المسموح ${maxVideoSizeMB} ميجابايت.`);
        return;
      }
    } else {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('الملف المختار ليس صورة صالحة (png, jpg, webp, svg).');
        return;
      }
      if (file.size > maxImageSizeMB * 1024 * 1024) {
        setErrorMessage(`حجم الصورة كبير جداً (${(file.size / (1024 * 1024)).toFixed(1)} ميجابايت). الحد الأقصى المسموح ${maxImageSizeMB} ميجابايت.`);
        return;
      }
    }

    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result as string;
      if (result) {
        onChange(result, isVideo ? 'video' : 'image');
      }
    };
    reader.onerror = () => {
      setErrorMessage('حدث خطأ أثناء قراءة الملف من الجهاز.');
    };
    reader.readAsDataURL(file);
  };

  const isVideo = mediaType === 'video' || (mediaUrl && (mediaUrl.startsWith('data:video') || mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm')));

  return (
    <div className="space-y-2 text-right text-xs">
      <label className="block font-bold text-zinc-700 dark:text-zinc-300">
        {label}
      </label>

      {/* Hidden File Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file, false);
          e.target.value = '';
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file, true);
          e.target.value = '';
        }}
      />

      {/* Error Notice */}
      {errorMessage && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] font-bold flex items-center gap-1.5 animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* When media is uploaded -> Preview Card */}
      {mediaUrl ? (
        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#141417] border border-gray-200 dark:border-[#27272A] space-y-2.5">
          <div className="relative rounded-xl overflow-hidden bg-black/5 dark:bg-black/30 flex items-center justify-center max-h-56">
            {isVideo ? (
              <video
                src={mediaUrl}
                controls
                playsInline
                className="max-h-56 w-full object-contain rounded-xl"
              />
            ) : (
              <img
                src={mediaUrl}
                alt="Preview"
                className="max-h-52 w-auto max-w-full object-contain rounded-xl mx-auto"
              />
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-200 dark:border-[#222228]">
            <span className="text-[11px] font-mono text-zinc-400">
              {isVideo ? '🎬 فيديو محلي مُحمّل' : '🖼️ صورة محلية مُحمّلة'}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500 hover:text-white text-orange-500 font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1"
                title="استبدال بصورة أخرى"
              >
                <RefreshCw className="w-3 h-3" /> استبدال بصورة
              </button>

              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500 hover:text-white text-purple-400 font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1"
                title="استبدال بفيديو آخر"
              >
                <Video className="w-3 h-3" /> استبدال بفيديو
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  onClear();
                }}
                className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="حذف الملف نهائياً"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State -> Dual Upload Buttons */
        <div className="p-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-[#27272A] hover:border-orange-500/50 bg-gray-50/50 dark:bg-[#141417]/50 text-center space-y-3 transition-colors">
          <div className="flex items-center justify-center gap-2">
            <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-500">
              <Upload className="w-5 h-5" />
            </div>
          </div>

          <div>
            <span className="block font-bold text-zinc-800 dark:text-zinc-200 text-xs">
              اختر صورة أو فيديو مباشرة من جهاز الكمبيوتر أو الهاتف
            </span>
            <span className="block text-[10px] text-zinc-400 mt-0.5">
              الصور حتى {maxImageSizeMB} ميجابايت • الفيديو حتى {maxVideoSizeMB} ميجابايت (بدون روابط خارجية)
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ImageIcon className="w-3.5 h-3.5" /> رفع صورة
            </button>

            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Video className="w-3.5 h-3.5" /> رفع فيديو
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
