import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlogPost } from '@/lib/blog';
import { generateTOC, addIdsToHeadings, calculateReadingTime } from '@/lib/blog-utils';
import TOCSection from '@/components/TOCSection';
import ScrollToTop from '@/components/ScrollToTop';
import ShareButtons from '@/components/ShareButtons';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getBlogPost(params.slug);
  
  if (!post) {
    return {
      title: 'ページが見つかりません | 日用品価格比較',
    };
  }
  
  return {
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt,
    keywords: post.meta_keywords,
    openGraph: {
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt,
      images: post.featured_image ? [post.featured_image] : undefined,
      type: 'article',
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at,
      authors: ['安く買う.com 編集部'],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt,
      images: post.featured_image ? [post.featured_image] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getBlogPost(params.slug);
  
  if (!post) {
    notFound();
  }
  
  // TOCと読了時間を生成
  const toc = generateTOC(post.content);
  const contentWithIds = addIdsToHeadings(post.content);
  const readingTimeMinutes = calculateReadingTime(post.content);
  
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ナビゲーション */}
      <nav className="mb-8">
        <Link href="/blog" className="text-blue-600 hover:text-blue-800">
          ← ブログ一覧に戻る
        </Link>
      </nav>
      
      {/* ヘッダー */}
      <header className="mb-8">
        {post.category && (
          <Link
            href={`/blog/category/${post.category.slug}`}
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            {post.category.name}
          </Link>
        )}
        
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
        
        <div className="flex items-center text-sm text-gray-600 mb-4 space-x-4">
          <span>
            著者: 安く買う.com 編集部
          </span>
          {post.published_at && (
            <time dateTime={post.published_at}>
              公開: {new Date(post.published_at).toLocaleDateString('ja-JP')}
            </time>
          )}
          {post.updated_at && post.updated_at !== post.published_at && (
            <time dateTime={post.updated_at}>
              更新: {new Date(post.updated_at).toLocaleDateString('ja-JP')}
            </time>
          )}
        </div>
        
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/blog/tag/${tag.slug}`}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        )}
        
        {post.featured_image && (
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-64 md:h-96 object-cover rounded-lg mb-8"
          />
        )}
      </header>
      
      {/* SNSシェアボタン（上部） */}
      <ShareButtons 
        url={`https://www.yasu-ku-kau.com/blog/${params.slug}`}
        title={post.title}
        description={post.excerpt}
      />
      
      {/* TOCと読了時間 */}
      {toc.length > 0 && (
        <TOCSection toc={toc} readingTimeMinutes={readingTimeMinutes} />
      )}
      
      {/* コンテンツ */}
      <article className="prose prose-lg max-w-none overflow-x-auto md:overflow-visible
        prose-headings:text-gray-900 prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b-2 prose-h2:border-gray-200 prose-h2:pb-2
        prose-h3:text-xl prose-h3:font-semibold prose-h3:text-gray-800 prose-h3:mt-6 prose-h3:mb-3
        prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
        prose-strong:text-gray-900 prose-strong:font-semibold
        prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-a:underline prose-a:font-medium
        prose-a:prose-strong:text-blue-600 hover:prose-a:prose-strong:text-blue-800
        prose-blockquote:bg-gray-50 prose-blockquote:border-l-4 prose-blockquote:border-gray-400 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:italic prose-blockquote:text-gray-600 prose-blockquote:text-sm [&_blockquote_p]:text-sm [&_blockquote_p]:leading-relaxed
        prose-ul:text-gray-700 prose-li:mb-2 prose-li:marker:text-gray-500
        prose-ol:text-gray-700
        prose-code:bg-gray-100 prose-code:text-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
        prose-table:min-w-full prose-table:border-collapse
        prose-th:border prose-th:border-gray-300 prose-th:px-4 prose-th:py-2 prose-th:bg-gray-100 prose-th:text-gray-800 prose-th:font-semibold
        prose-td:border prose-td:border-gray-300 prose-td:px-4 prose-td:py-2 prose-td:text-gray-700
        prose-img:max-h-[360px] prose-img:w-auto prose-img:mx-auto prose-img:rounded-lg prose-img:shadow-lg
        [&_a>strong]:text-blue-600 [&_a>strong]:hover:text-blue-800">
        <div dangerouslySetInnerHTML={{ __html: contentWithIds }} />
      </article>
      
      {/* SNSシェアボタン */}
      <ShareButtons 
        url={`https://www.yasu-ku-kau.com/blog/${params.slug}`}
        title={post.title}
        description={post.excerpt}
      />
      
      {/* 著者紹介 */}
      <div className="mt-12 p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
        <h3 className="text-lg font-bold text-gray-900 mb-3">この記事を書いた人</h3>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">安</span>
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 mb-2">安く買う.com 編集部</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              日用品の価格比較に特化した専門チーム。Amazon内で販売される商品の価格データを日々収集・分析し、
              本当にお得な商品を見つけるお手伝いをしています。「単価で比較」をモットーに、
              見かけの価格に惑わされない賢い買い物術を発信中。
            </p>
            <div className="mt-3">
              <Link href="/" className="text-orange-600 hover:text-orange-700 text-sm font-medium">
                →価格比較ツールを使ってみる
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* フッター */}
      <footer className="mt-12 pt-8 border-t border-gray-200">
        <div className="text-center">
          <Link
            href="/blog"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            他の記事を読む
          </Link>
        </div>
      </footer>
      <ScrollToTop />
    </div>
  );
}