import Link from 'next/link';
import { notFound } from 'next/navigation';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featured_image?: string;
  category?: { id: number; name: string; slug: string };
  tags: { id: number; name: string; slug: string }[];
  author: { id: number; username: string; first_name: string; last_name: string };
  published_at: string;
  view_count: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  post_count: number;
}

async function getCategory(slug: string): Promise<Category | null> {
  try {
    const res = await fetch('http://localhost:8001/api/blog/categories', {
      next: { revalidate: 3600 }
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch categories');
    }
    
    const categories: Category[] = await res.json();
    return categories.find(cat => cat.slug === slug) || null;
  } catch (error) {
    console.error('Error fetching category:', error);
    return null;
  }
}

async function getBlogPostsByCategory(categorySlug: string): Promise<BlogPost[]> {
  try {
    const res = await fetch(`http://localhost:8001/api/blog/posts?category=${categorySlug}`, {
      next: { revalidate: 3600 }
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch blog posts');
    }
    
    return res.json();
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const [category, posts] = await Promise.all([
    getCategory(params.slug),
    getBlogPostsByCategory(params.slug)
  ]);
  
  if (!category) {
    notFound();
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ナビゲーション */}
      <nav className="mb-8">
        <Link href="/blog" className="text-blue-600 hover:text-blue-800">
          ← ブログ一覧に戻る
        </Link>
      </nav>
      
      {/* ヘッダー */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          カテゴリー: {category.name}
        </h1>
        {category.description && (
          <p className="text-lg text-gray-600 mb-4">{category.description}</p>
        )}
        <p className="text-sm text-gray-500">
          {category.post_count}件の記事
        </p>
      </header>
      
      {/* 記事一覧 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <article key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            {post.featured_image && (
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                <Link href={`/blog/${post.slug}`} className="hover:text-blue-600">
                  {post.title}
                </Link>
              </h2>
              <p className="text-gray-600 line-clamp-3 mb-4">{post.excerpt}</p>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>
                  {post.author.first_name} {post.author.last_name}
                </span>
                <time dateTime={post.published_at}>
                  {new Date(post.published_at).toLocaleDateString('ja-JP')}
                </time>
              </div>
              {post.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/blog/tag/${tag.slug}`}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      
      {posts.length === 0 && (
        <p className="text-center text-gray-500 py-12">
          このカテゴリーにはまだ記事がありません。
        </p>
      )}
    </div>
  );
}