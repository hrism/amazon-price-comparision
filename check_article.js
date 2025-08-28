// check_article.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkArticle() {
  // IDで記事を取得（複数の場合も考慮）
  const { data: articlesById, error: errorById } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', '414d15d5-f9f8-4d7e-9d2d-7eb87b2538c8');
  
  console.log('=== ID 414d15d5-f9f8-4d7e-9d2d-7eb87b2538c8 の記事 ===');
  if (errorById) {
    console.log('Error:', errorById.message);
  } else if (articlesById && articlesById.length > 0) {
    console.log(`${articlesById.length}件の記事が見つかりました`);
    articlesById.forEach((article, index) => {
      console.log(`\n記事 ${index + 1}:`);
      console.log('Slug:', article.slug);
      console.log('Title:', article.title);
      console.log('Status:', article.status);
      console.log('Published at:', article.published_at);
    });
  } else {
    console.log('記事が見つかりません');
  }
  
  const articleById = articlesById?.[0];
  
  console.log('\n=== toilet-paper-panic-history の記事 ===');
  // Slugで記事を取得（複数の場合も考慮）
  const { data: articlesBySlug, error: errorBySlug } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', 'toilet-paper-panic-history');
  
  if (errorBySlug) {
    console.log('Error:', errorBySlug.message);
  } else if (articlesBySlug && articlesBySlug.length > 0) {
    console.log(`${articlesBySlug.length}件の記事が見つかりました`);
    articlesBySlug.forEach((article, index) => {
      console.log(`\n記事 ${index + 1}:`);
      console.log('ID:', article.id);
      console.log('Title:', article.title);
      console.log('Status:', article.status);
      console.log('Published at:', article.published_at);
    });
  } else {
    console.log('記事が見つかりません');
  }
  
  const articleBySlug = articlesBySlug?.[0];
  
  // 現在時刻と比較
  const now = new Date();
  console.log('\n=== 時刻比較 ===');
  console.log('現在時刻 (UTC):', now.toISOString());
  console.log('現在時刻 (JST):', new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString());
  
  if (articleById || articleBySlug) {
    const article = articleById || articleBySlug;
    if (article.published_at) {
      const publishedAt = new Date(article.published_at);
      console.log('公開予定時刻:', publishedAt.toISOString());
      console.log('公開判定:', now >= publishedAt ? '✅ 公開時刻を過ぎています' : '❌ まだ公開時刻前です');
    }
  }
}

checkArticle().catch(console.error);