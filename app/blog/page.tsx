import Link from 'next/link';
import { getBlogPosts, BlogPost } from '@/lib/blog';

export default async function BlogPage() {
  const { posts } = await getBlogPosts();
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">ブログ</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <article key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-[16/9] relative bg-gray-100">
              {post.featured_image ? (
                <img
                  src={post.featured_image}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                  <svg className="w-16 h-16 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="p-6">
              {post.category && (
                <Link
                  href={`/blog/category/${post.category.slug}`}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {post.category.name}
                </Link>
              )}
              <h2 className="mt-2 text-xl font-semibold text-gray-900">
                <Link href={`/blog/${post.slug}`} className="hover:text-blue-600">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-3 text-gray-600 line-clamp-3">{post.excerpt}</p>
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <span>
                  安く買う.com 編集部
                </span>
                <time dateTime={post.published_at || ''}>
                  {post.published_at ? new Date(post.published_at).toLocaleDateString('ja-JP') : ''}
                </time>
              </div>
              {post.tags && post.tags.length > 0 && (
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
          まだ記事が投稿されていません。
        </p>
      )}
    </div>
  );
}