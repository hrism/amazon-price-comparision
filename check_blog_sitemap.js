// 公開中のブログ記事とsitemapの確認スクリプト
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkBlogPosts() {
  console.log('=== 公開中のブログ記事を確認 ===\n');
  
  const now = new Date().toISOString();
  
  // 公開中の記事を取得
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, status, published_at, created_at')
    .or(`status.eq.published,and(status.eq.scheduled,published_at.lte.${now})`)
    .order('published_at', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`公開中の記事数: ${posts?.length || 0}\n`);
  
  if (posts && posts.length > 0) {
    console.log('記事一覧:');
    posts.forEach((post, index) => {
      console.log(`${index + 1}. ${post.title}`);
      console.log(`   Slug: ${post.slug}`);
      console.log(`   Status: ${post.status}`);
      console.log(`   Published: ${post.published_at}`);
      console.log(`   URL: https://www.yasu-ku-kau.com/blog/${post.slug}`);
      console.log('');
    });
  }
  
  // Sitemapの内容を確認
  console.log('=== Sitemap.xml の確認 ===\n');
  
  try {
    const response = await fetch('https://www.yasu-ku-kau.com/sitemap.xml');
    const sitemapText = await response.text();
    
    // ブログ記事のURLを抽出
    const blogUrlPattern = /https:\/\/www\.yasu-ku-kau\.com\/blog\/[^<]+/g;
    const sitemapBlogUrls = sitemapText.match(blogUrlPattern) || [];
    
    console.log(`Sitemapに含まれるブログ記事数: ${sitemapBlogUrls.length}\n`);
    
    if (sitemapBlogUrls.length > 0) {
      console.log('Sitemapのブログ記事URL:');
      sitemapBlogUrls.forEach((url, index) => {
        console.log(`${index + 1}. ${url}`);
      });
      console.log('');
    }
    
    // 差分チェック
    if (posts && posts.length > 0) {
      console.log('=== 差分チェック ===\n');
      
      const missingInSitemap = posts.filter(post => {
        const postUrl = `https://www.yasu-ku-kau.com/blog/${post.slug}`;
        return !sitemapBlogUrls.includes(postUrl);
      });
      
      if (missingInSitemap.length > 0) {
        console.log('❌ Sitemapに含まれていない記事:');
        missingInSitemap.forEach(post => {
          console.log(`- ${post.title} (${post.slug})`);
        });
      } else {
        console.log('✅ すべての公開記事がSitemapに含まれています');
      }
    }
    
  } catch (error) {
    console.error('Sitemap取得エラー:', error);
  }
  
  process.exit(0);
}

checkBlogPosts();