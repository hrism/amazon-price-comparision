'use client';

import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface SimpleMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SimpleMarkdownEditor({ value, onChange, placeholder }: SimpleMarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      // エディタに画像マークダウンを挿入
      const imageMarkdown = `![${file.name}](${publicUrl})`;
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const newText = value.substring(0, start) + imageMarkdown + value.substring(start);
        onChange(newText);
        
        // カーソル位置を調整
        setTimeout(() => {
          textarea.selectionStart = start + imageMarkdown.length;
          textarea.selectionEnd = start + imageMarkdown.length;
          textarea.focus();
        }, 0);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`アップロードに失敗しました: ${error.message}`);
    } finally {
      setUploading(false);
      // inputをリセット
      e.target.value = '';
    }
  };

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    
    onChange(newText);
    
    // カーソル位置を調整
    setTimeout(() => {
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selectedText.length;
      textarea.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab押下時にインデント
    if (e.key === 'Tab') {
      e.preventDefault();
      insertMarkdown('  ');
    }
    
    // Ctrl/Cmd + B で太字
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      insertMarkdown('**', '**');
    }
    
    // Ctrl/Cmd + I で斜体
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      insertMarkdown('*', '*');
    }
  };

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden relative">
      {/* ツールバー */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1">
        {uploading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="text-gray-600">アップロード中...</div>
          </div>
        )}
        <button
          type="button"
          onClick={() => insertMarkdown('**', '**')}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
          title="太字 (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown('*', '*')}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
          title="斜体 (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown('## ')}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown('### ')}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown('[', '](url)')}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
        >
          リンク
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown('![alt](', ')')}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
        >
          画像リンク
        </button>
        <label className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 cursor-pointer">
          画像アップロード
          <input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>
        <button
          type="button"
          onClick={() => insertMarkdown('- ')}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
        >
          リスト
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown('> ')}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
        >
          引用
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown('`', '`')}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
        >
          コード
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown('```\n', '\n```')}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
        >
          コードブロック
        </button>
      </div>
      
      {/* テキストエリア */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full p-4 min-h-[400px] font-mono text-sm focus:outline-none resize-y"
        style={{ tabSize: 2 }}
      />
      
      {/* ヘルプテキスト */}
      <div className="bg-gray-50 border-t border-gray-200 p-3">
        <p className="text-xs text-gray-600 mb-1">
          <strong>Markdownショートカット:</strong>
        </p>
        <ul className="text-xs text-gray-500 space-y-0.5">
          <li>• <kbd>Ctrl+B</kbd> / <kbd>Cmd+B</kbd>: 太字</li>
          <li>• <kbd>Ctrl+I</kbd> / <kbd>Cmd+I</kbd>: 斜体</li>
          <li>• 見出し: ## H2, ### H3</li>
          <li>• リンク: [テキスト](URL)</li>
          <li>• 画像: ![alt](URL) または画像アップロードボタン</li>
          <li>• テーブル: | 列1 | 列2 |</li>
        </ul>
      </div>
    </div>
  );
}