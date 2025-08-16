'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getBlogCategories, getBlogTags, type BlogCategory, type BlogTag } from '@/lib/blog';
import MarkdownEditor from '@/components/MarkdownEditor';
import ImageUpload from '@/components/ImageUpload';
import { remark } from 'remark';
import html from 'remark-html';
import gfm from 'remark-gfm';

export default function NewPostPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    featured_image: '',
    status: 'draft' as 'draft' | 'published' | 'scheduled',
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    category_id: '',
    tag_ids: [] as number[],
    published_at: '',
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/admin');
        return;
      }
      setUser(user);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/admin');
    } finally {
      setAuthLoading(false);
    }
  };

  const loadData = async () => {
    const [categoriesData, tagsData] = await Promise.all([
      getBlogCategories(),
      getBlogTags()
    ]);
    setCategories(categoriesData);
    setTags(tagsData);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title)
    }));
  };

  const handleTagChange = (tagId: number) => {
    setFormData(prev => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter(id => id !== tagId)
        : [...prev.tag_ids, tagId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('ログインが必要です');
        return;
      }

      // マークダウンをHTMLに変換（GFMサポート付き）
      const processedContent = await remark()
        .use(gfm)
        .use(html, { 
          allowDangerousHtml: false,
          sanitize: false 
        })
        .process(formData.content);
      const htmlContent = processedContent.toString();

      // 記事作成
      const postData = {
        title: formData.title,
        slug: formData.slug,
        content: htmlContent,
        excerpt: formData.excerpt || null,
        featured_image: formData.featured_image || null,
        status: formData.status,
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || null,
        meta_keywords: formData.meta_keywords || null,
        author_id: user.id,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        published_at: formData.status === 'published' && !formData.published_at 
          ? new Date().toISOString()
          : formData.published_at || null,
      };

      // デバッグ用：送信データをコンソールに出力
      console.log('Sending post data:', postData);
      console.log('Content length:', htmlContent.length);

      const { data: post, error: postError } = await supabase
        .from('blog_posts')
        .insert(postData)
        .select()
        .single();

      if (postError) {
        console.error('Supabase error:', postError);
        throw postError;
      }

      // タグの関連付け（エラーが出ても記事は保存済み）
      if (formData.tag_ids.length > 0 && post) {
        const tagRelations = formData.tag_ids.map(tagId => ({
          post_id: post.id,
          tag_id: tagId
        }));

        const { error: tagError } = await supabase
          .from('blog_post_tags')
          .insert(tagRelations);

        if (tagError) {
          console.error('Tag relation error:', tagError);
          // タグのエラーは警告のみ（記事は保存済み）
          alert('記事は保存されましたが、タグの設定でエラーが発生しました。\n記事の編集画面から再度タグを設定してください。');
          router.push('/admin');
          return;
        }
      }

      alert('記事を保存しました');
      router.push('/admin');
    } catch (error: any) {
      console.error('Error saving post:', error);
      
      // より詳細なエラーメッセージを表示
      let errorMessage = '保存に失敗しました\n\n';
      
      if (error.message) {
        errorMessage += `エラー: ${error.message}\n`;
      }
      
      if (error.code) {
        errorMessage += `コード: ${error.code}\n`;
      }
      
      if (error.details) {
        errorMessage += `詳細: ${JSON.stringify(error.details)}\n`;
      }
      
      // Supabaseのエラーの場合
      if (error.hint) {
        errorMessage += `ヒント: ${error.hint}\n`;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">認証確認中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">認証が必要です</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">新しい記事を作成</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* タイトル */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            タイトル *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* スラッグ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            スラッグ（URL用）
          </label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* コンテンツ */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              本文 *
            </label>
            <button
              type="button"
              onClick={async () => {
                if (!previewMode) {
                  // プレビューに切り替え時、マークダウンをHTMLに変換（GFMサポート付き）
                  const processedContent = await remark()
                    .use(gfm)
                    .use(html, { 
                      allowDangerousHtml: false,
                      sanitize: false 
                    })
                    .process(formData.content);
                  setPreviewHtml(processedContent.toString());
                }
                setPreviewMode(!previewMode);
              }}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              {previewMode ? '編集モード' : 'プレビュー'}
            </button>
          </div>
          
          {previewMode ? (
            <div className="border border-gray-300 rounded-md p-4 min-h-[300px] bg-white overflow-x-auto">
              <div 
                className="prose prose-lg max-w-none prose-table:min-w-full prose-table:border-collapse prose-th:border prose-th:border-gray-300 prose-th:px-4 prose-th:py-2 prose-th:bg-gray-100 prose-td:border prose-td:border-gray-300 prose-td:px-4 prose-td:py-2"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          ) : (
            <MarkdownEditor
              value={formData.content}
              onChange={(content) => setFormData(prev => ({ ...prev, content }))}
              placeholder="記事の本文を入力してください..."
            />
          )}
        </div>

        {/* 抜粋 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            抜粋
          </label>
          <textarea
            rows={3}
            value={formData.excerpt}
            onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="記事の要約（SEO用）"
          />
        </div>

        {/* アイキャッチ画像 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            アイキャッチ画像
          </label>
          <ImageUpload
            value={formData.featured_image}
            onChange={(url) => setFormData(prev => ({ ...prev, featured_image: url }))}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* カテゴリー */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              カテゴリー
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">カテゴリーを選択</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* ステータス */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">下書き</option>
              <option value="published">公開</option>
              <option value="scheduled">予約投稿</option>
            </select>
          </div>
        </div>

        {/* タグ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            タグ
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {tags.map(tag => (
              <label key={tag.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.tag_ids.includes(tag.id)}
                  onChange={() => handleTagChange(tag.id)}
                  className="mr-2"
                />
                {tag.name}
              </label>
            ))}
          </div>
        </div>

        {/* SEO設定 */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">SEO設定</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SEOタイトル（60文字以内）
              </label>
              <input
                type="text"
                maxLength={60}
                value={formData.meta_title}
                onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SEO説明文（160文字以内）
              </label>
              <textarea
                maxLength={160}
                rows={3}
                value={formData.meta_description}
                onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                キーワード（カンマ区切り）
              </label>
              <input
                type="text"
                value={formData.meta_keywords}
                onChange={(e) => setFormData(prev => ({ ...prev, meta_keywords: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="キーワード1,キーワード2,キーワード3"
              />
            </div>
          </div>
        </div>

        {/* 送信ボタン */}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '保存中...' : '保存'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}