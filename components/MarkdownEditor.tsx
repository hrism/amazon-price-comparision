'use client';

import dynamic from 'next/dynamic';
import '@mdxeditor/editor/style.css';
import { supabase } from '@/lib/supabase';

// MDXEditorを動的インポート（SSR無効化）
const MDXEditor = dynamic(
  () => import('@mdxeditor/editor').then((mod) => mod.MDXEditor),
  { ssr: false }
);

import {
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  tablePlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  BlockTypeSelect,
  DiffSourceToggleWrapper,
  InsertCodeBlock,
} from '@mdxeditor/editor';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  return (
    <div className="markdown-editor border border-gray-300 rounded-md overflow-hidden">
      <MDXEditor
        markdown={value || ''}
        onChange={onChange}
        plugins={[
          // 基本的なマークダウン機能
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),

          // テーブル機能
          tablePlugin(),

          // リンクと画像
          linkPlugin(),
          linkDialogPlugin(),
          imagePlugin({
            imageUploadHandler: async (file) => {
              // ファイルサイズチェック（5MB以下）
              if (file.size > 5 * 1024 * 1024) {
                throw new Error('ファイルサイズは5MB以下にしてください');
              }

              // ファイルタイプチェック
              if (!file.type.startsWith('image/')) {
                throw new Error('画像ファイルを選択してください');
              }

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

                return publicUrl;
              } catch (error: any) {
                console.error('Upload error:', error);
                throw new Error(`アップロードに失敗しました: ${error.message}`);
              }
            }
          }),

          // コードブロック
          codeBlockPlugin({ defaultCodeBlockLanguage: 'js' }),
          codeMirrorPlugin({
            codeBlockLanguages: {
              js: 'JavaScript',
              css: 'CSS',
              html: 'HTML',
              python: 'Python',
              sql: 'SQL',
              json: 'JSON',
              markdown: 'Markdown',
            },
          }),

          // ソース表示切り替え
          diffSourcePlugin({ viewMode: 'rich-text' }),

          // ツールバー
          toolbarPlugin({
            toolbarContents: () => (
              <>
                <DiffSourceToggleWrapper>
                  <UndoRedo />
                  <BlockTypeSelect />
                  <BoldItalicUnderlineToggles />
                  <CodeToggle />
                  <CreateLink />
                  <InsertImage />
                  <InsertTable />
                  <InsertThematicBreak />
                  <ListsToggle />
                  <InsertCodeBlock />
                </DiffSourceToggleWrapper>
              </>
            ),
          }),
        ]}
        placeholder={placeholder}
        contentEditableClassName="prose prose-lg max-w-none min-h-[400px] max-h-[600px] overflow-y-auto p-4"
      />

      {/* ヘルプテキスト */}
      <div className="bg-gray-50 border-t border-gray-200 p-3">
        <p className="text-sm text-gray-600">
          <strong>💡 ヒント:</strong>
        </p>
        <ul className="text-xs text-gray-500 mt-1 space-y-1">
          <li>• <strong>テーブル挿入</strong>: ツールバーのテーブルボタンから作成</li>
          <li>• <strong>マークダウン記法</strong>: ## 見出し, **太字**, *斜体*, `コード`</li>
          <li>• <strong>テーブル記法</strong>: | 列1 | 列2 | でテーブル作成可能</li>
          <li>• <strong>ソース表示</strong>: 左上のボタンでマークダウンソース表示</li>
        </ul>
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs text-yellow-800">
            <strong>⚠️ 注意:</strong> 全角の鍵括弧「」と太字**を併用すると表示が崩れる場合があります。
            <br />**「括弧内テキスト」**のように括弧の外側を太字にする代わりに、
            <br />「<strong>**括弧内テキスト**</strong>」のように括弧の中身のみを太字にしてください。
          </p>
        </div>
      </div>
    </div>
  );
}