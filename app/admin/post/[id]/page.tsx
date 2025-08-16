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
import { htmlToMarkdown } from '@/lib/html-to-markdown';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  status: 'draft' | 'published' | 'scheduled';
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  category_id?: number;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export default function EditPostPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  
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
    published_at: '',
  });
  const [isContentLoaded, setIsContentLoaded] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
      loadPost();
    }
  }, [params.id, user]);

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

  const loadPost = async () => {
    try {
      console.log('Loading post with ID:', params.id);
      
      // UUIDフォーマットをチェック
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(params.id)) {
        console.error('Invalid post ID format:', params.id);
        alert('無効な記事IDです');
        router.push('/admin');
        return;
      }
      
      // 記事データを取得
      const { data: post, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', params.id)
        .single();

      console.log('Supabase response:', { post, error });

      if (error || !post) {
        console.error('Post not found:', error);
        alert('記事が見つかりません');
        router.push('/admin');
        return;
      }

      console.log('Loaded post:', post);
      console.log('Post content length:', post.content?.length);
      console.log('Post content sample:', post.content?.substring(0, 500));
      
      // デバッグ: 鍵括弧を含む強調タグを探す
      const strongTagsWithBrackets = post.content?.match(/<strong[^>]*>[^<]*[「」][^<]*<\/strong>/gi);
      if (strongTagsWithBrackets) {
        console.log('Found strong tags with Japanese brackets:', strongTagsWithBrackets);
      }

      // HTMLをマークダウンに変換
      let markdownContent = '';
      try {
        // 変換前の内容を詳しく確認
        const testContent = post.content || '';
        const boldPatternIndex = testContent.indexOf('<strong>「');
        if (boldPatternIndex !== -1) {
          console.log('Found bold with bracket at index:', boldPatternIndex);
          console.log('Context:', testContent.substring(boldPatternIndex, boldPatternIndex + 100));
        }
        
        markdownContent = htmlToMarkdown(post.content || '');
        console.log('Converted markdown:', markdownContent);
        console.log('Markdown length:', markdownContent.length);
        
        // 変換後の内容を確認
        const convertedBoldIndex = markdownContent.indexOf('**「');
        if (convertedBoldIndex !== -1) {
          console.log('Converted bold with bracket at index:', convertedBoldIndex);
          console.log('Converted context:', markdownContent.substring(convertedBoldIndex, convertedBoldIndex + 100));
        }
      } catch (error) {
        console.error('Markdown conversion error:', error);
        // 変換に失敗した場合は元のHTMLをそのまま使用
        markdownContent = post.content || '';
      }
      
      // 変換結果が空の場合は元のコンテンツを保持
      const finalContent = markdownContent || post.content || '';
      console.log('Final content to set:', finalContent.substring(0, 200));
      
      // デバッグ: 太字が正しく設定されているか確認
      if (finalContent.includes('**「')) {
        console.log('Bold with brackets preserved in final content');
      }

      setOriginalContent(post.content || '');
    
      setFormData({
        title: post.title,
        slug: post.slug,
        content: finalContent, // 変換されたマークダウンを設定
        excerpt: post.excerpt || '',
        featured_image: post.featured_image || '',
        status: post.status,
        meta_title: post.meta_title || '',
        meta_description: post.meta_description || '',
        meta_keywords: post.meta_keywords || '',
        category_id: post.category_id?.toString() || '',
        published_at: post.published_at || '',
      });
      
      setIsContentLoaded(true);

      // タグを取得
      const { data: tagRelations } = await supabase
        .from('blog_post_tags')
        .select('tag_id')
        .eq('post_id', params.id);

      if (tagRelations) {
        setSelectedTags(tagRelations.map(rel => rel.tag_id));
      }
    } catch (err) {
      console.error('Error loading post:', err);
      alert('記事の読み込みに失敗しました');
    }
  };

  const handleTagChange = (tagId: number) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
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

      // 記事更新
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
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        published_at: formData.status === 'published' && !formData.published_at 
          ? new Date().toISOString()
          : formData.published_at || null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('blog_posts')
        .update(postData)
        .eq('id', params.id);

      if (updateError) {
        throw updateError;
      }

      // タグの更新（既存を削除して再作成）
      await supabase
        .from('blog_post_tags')
        .delete()
        .eq('post_id', params.id);

      if (selectedTags.length > 0) {
        const tagRelations = selectedTags.map(tagId => ({
          post_id: params.id,
          tag_id: tagId
        }));

        await supabase
          .from('blog_post_tags')
          .insert(tagRelations);
      }

      alert('記事を更新しました');
      router.push('/admin');
    } catch (error: any) {
      console.error('Error updating post:', error);
      alert(`更新に失敗しました: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('本当にこの記事を削除しますか？')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', params.id);

      if (error) throw error;

      alert('記事を削除しました');
      router.push('/admin');
    } catch (error: any) {
      alert(`削除に失敗しました: ${error.message}`);
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
        <h1 className="text-3xl font-bold text-gray-900">記事を編集</h1>
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
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
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
          ) : isContentLoaded ? (
            <MarkdownEditor
              value={formData.content}
              onChange={(content) => setFormData(prev => ({ ...prev, content }))}
              placeholder="記事の本文を入力してください..."
            />
          ) : (
            <div className="border border-gray-300 rounded-md p-4 min-h-[300px] bg-gray-100 flex items-center justify-center">
              <p className="text-gray-500">読み込み中...</p>
            </div>
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
                  checked={selectedTags.includes(tag.id)}
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
                SEOタイトル
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
                SEO説明文
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
                キーワード
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

        {/* ボタン */}
        <div className="flex justify-between">
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '更新中...' : '更新'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              キャンセル
            </button>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            削除
          </button>
        </div>
      </form>
    </div>
  );
}