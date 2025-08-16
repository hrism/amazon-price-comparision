'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

export default function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（5MB以下）
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズは5MB以下にしてください');
      return;
    }

    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }

    setUploading(true);

    try {
      // ユニークなファイル名を生成
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `blog-images/${fileName}`;

      // Supabase Storageにアップロード
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      setPreview(publicUrl);
      onChange(publicUrl);
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`アップロードに失敗しました: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview('');
    onChange('');
  };

  return (
    <div className="space-y-4">
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="アイキャッチ画像"
            className="w-full max-h-64 object-cover rounded-md border border-gray-300"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            削除
          </button>
        </div>
      ) : (
        <label className="block cursor-pointer">
          <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center hover:border-gray-400">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              クリックして画像をアップロード
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPG, GIF, WEBP (最大 5MB)
            </p>
          </div>
          <input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      )}
      
      {uploading && (
        <p className="text-sm text-gray-600">アップロード中...</p>
      )}
      
      {/* URL入力フィールド（オプション） */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">
          または直接URLを入力
        </label>
        <input
          type="url"
          value={value}
          onChange={(e) => {
            setPreview(e.target.value);
            onChange(e.target.value);
          }}
          placeholder="https://example.com/image.jpg"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>
    </div>
  );
}