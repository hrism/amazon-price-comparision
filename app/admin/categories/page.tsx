'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getBlogCategories, getBlogTags, type BlogCategory, type BlogTag } from '@/lib/blog';
import Link from 'next/link';

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // カテゴリ追加フォーム
  const [newCategory, setNewCategory] = useState({
    name: '',
    slug: '',
    description: ''
  });
  
  // タグ追加フォーム
  const [newTag, setNewTag] = useState({
    name: '',
    slug: ''
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
    setLoading(false);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const categoryData = {
        ...newCategory,
        slug: newCategory.slug || generateSlug(newCategory.name)
      };

      const { error } = await supabase
        .from('blog_categories')
        .insert(categoryData);

      if (error) throw error;

      alert('カテゴリを追加しました');
      setNewCategory({ name: '', slug: '', description: '' });
      loadData();
    } catch (error) {
      console.error('Error adding category:', error);
      alert('カテゴリの追加に失敗しました');
    }
  };

  const handleTagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const tagData = {
        ...newTag,
        slug: newTag.slug || generateSlug(newTag.name)
      };

      const { error } = await supabase
        .from('blog_tags')
        .insert(tagData);

      if (error) throw error;

      alert('タグを追加しました');
      setNewTag({ name: '', slug: '' });
      loadData();
    } catch (error) {
      console.error('Error adding tag:', error);
      alert('タグの追加に失敗しました');
    }
  };

  const deleteCategory = async (id: number) => {
    if (!confirm('このカテゴリを削除しますか？')) return;

    try {
      const { error } = await supabase
        .from('blog_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('カテゴリを削除しました');
      loadData();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('カテゴリの削除に失敗しました');
    }
  };

  const deleteTag = async (id: number) => {
    if (!confirm('このタグを削除しますか？')) return;

    try {
      const { error } = await supabase
        .from('blog_tags')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('タグを削除しました');
      loadData();
    } catch (error) {
      console.error('Error deleting tag:', error);
      alert('タグの削除に失敗しました');
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

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">読み込み中...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Link
            href="/admin"
            className="text-blue-600 hover:text-blue-800"
          >
            ← 管理画面に戻る
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">カテゴリ・タグ管理</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* カテゴリ管理 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">カテゴリ</h2>
          
          {/* カテゴリ追加フォーム */}
          <form onSubmit={handleCategorySubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium mb-3">新しいカテゴリを追加</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  カテゴリ名 *
                </label>
                <input
                  type="text"
                  required
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ 
                    ...prev, 
                    name: e.target.value,
                    slug: prev.slug || generateSlug(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: テクノロジー"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  スラッグ
                </label>
                <input
                  type="text"
                  value={newCategory.slug}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: technology"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  説明
                </label>
                <textarea
                  rows={2}
                  value={newCategory.description}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="カテゴリの説明"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                カテゴリを追加
              </button>
            </div>
          </form>

          {/* カテゴリ一覧 */}
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                <div>
                  <div className="font-medium">{category.name}</div>
                  <div className="text-sm text-gray-500">/{category.slug}</div>
                  {category.description && (
                    <div className="text-sm text-gray-600 mt-1">{category.description}</div>
                  )}
                </div>
                <button
                  onClick={() => deleteCategory(category.id)}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* タグ管理 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">タグ</h2>
          
          {/* タグ追加フォーム */}
          <form onSubmit={handleTagSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium mb-3">新しいタグを追加</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  タグ名 *
                </label>
                <input
                  type="text"
                  required
                  value={newTag.name}
                  onChange={(e) => setNewTag(prev => ({ 
                    ...prev, 
                    name: e.target.value,
                    slug: prev.slug || generateSlug(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: AI"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  スラッグ
                </label>
                <input
                  type="text"
                  value={newTag.slug}
                  onChange={(e) => setNewTag(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: ai"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                タグを追加
              </button>
            </div>
          </form>

          {/* タグ一覧 */}
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                <span className="text-sm">{tag.name}</span>
                <button
                  onClick={() => deleteTag(tag.id)}
                  className="ml-2 text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}