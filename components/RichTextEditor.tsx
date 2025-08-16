'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// React Quillを動的インポート（SSR対応）
const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-md"></div>
});

// Quillスタイルをインポート
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  // Quillエディタの設定
  const modules = {
    toolbar: [
      // フォーマット
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      
      // スタイル
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      
      // 段落・リスト
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }],
      
      // 挿入
      ['link', 'image', 'video'],
      ['blockquote', 'code-block'],
      
      // その他
      ['clean']
    ],
    clipboard: {
      // 貼り付け時の自動クリーンアップ
      matchVisual: false,
    }
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 
    'color', 'background', 'script',
    'list', 'bullet', 'indent', 'align',
    'link', 'image', 'video',
    'blockquote', 'code-block'
  ];

  // カスタムスタイル
  useEffect(() => {
    // Quillエディタのカスタムスタイルを追加
    const style = document.createElement('style');
    style.textContent = `
      .ql-editor {
        min-height: 300px;
        font-size: 16px;
        line-height: 1.6;
      }
      
      .ql-editor h1 {
        font-size: 2em;
        font-weight: bold;
        margin: 1em 0 0.5em 0;
      }
      
      .ql-editor h2 {
        font-size: 1.5em;
        font-weight: bold;
        margin: 1em 0 0.5em 0;
      }
      
      .ql-editor h3 {
        font-size: 1.25em;
        font-weight: bold;
        margin: 1em 0 0.5em 0;
      }
      
      .ql-editor h4 {
        font-size: 1.1em;
        font-weight: bold;
        margin: 1em 0 0.5em 0;
      }
      
      .ql-editor blockquote {
        border-left: 4px solid #ccc;
        margin: 1em 0;
        padding: 0.5em 1em;
        background-color: #f9f9f9;
      }
      
      .ql-editor pre {
        background-color: #f4f4f4;
        padding: 1em;
        border-radius: 4px;
        overflow-x: auto;
      }
      
      .ql-editor code {
        background-color: #f4f4f4;
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-family: monospace;
      }
      
      .ql-editor ul, .ql-editor ol {
        margin: 1em 0;
        padding-left: 2em;
      }
      
      .ql-editor li {
        margin: 0.5em 0;
      }
      
      .ql-editor img {
        max-width: 100%;
        height: auto;
        margin: 1em 0;
      }
      
      .ql-editor p {
        margin: 1em 0;
      }
      
      .ql-toolbar {
        border-top: 1px solid #ccc;
        border-left: 1px solid #ccc;
        border-right: 1px solid #ccc;
      }
      
      .ql-container {
        border-bottom: 1px solid #ccc;
        border-left: 1px solid #ccc;
        border-right: 1px solid #ccc;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="rich-text-editor">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || "記事の本文を入力してください..."}
        style={{
          backgroundColor: 'white',
          borderRadius: '0.375rem',
        }}
      />
      
      {/* ヘルプテキスト */}
      <div className="mt-2 text-sm text-gray-500">
        <p>💡 <strong>使い方のヒント:</strong></p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>見出しは「Header」から選択（H1〜H6）</li>
          <li>リストは「Ordered/Bullet」ボタンから作成</li>
          <li>画像は「Image」ボタンでURL指定で挿入</li>
          <li>引用は「Quote」ボタンで作成</li>
          <li>コードは「Code」ボタンで挿入</li>
        </ul>
      </div>
    </div>
  );
}