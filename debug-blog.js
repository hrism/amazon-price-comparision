const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugBlog() {
  console.log('🔍 Supabaseブログデータをデバッグ中...\n');
  console.log('URL:', supabaseUrl);
  console.log('Key:', supabaseKey.substring(0, 20) + '...\n');

  // 1. blog_postsテーブルの全記事を確認
  console.log('📝 === blog_posts テーブル ===');
  const { data: posts, error: postsError } = await supabase
    .from('blog_posts')
    .select('id, title, slug, status, published_at, created_at, author_id')
    .order('created_at', { ascending: false });

  if (postsError) {
    console.error('❌ エラー:', postsError);
  } else {
    console.log(`✅ ${posts?.length || 0}件の記事が見つかりました:\n`);
    posts?.forEach((post, i) => {
      console.log(`${i + 1}. ${post.title}`);
      console.log(`   - ID: ${post.id}`);
      console.log(`   - Slug: ${post.slug}`);
      console.log(`   - Status: ${post.status}`);
      console.log(`   - Published: ${post.published_at || 'NULL'}`);
      console.log(`   - Created: ${post.created_at}`);
      console.log(`   - Author: ${post.author_id || 'NULL'}`);
      console.log('');
    });
  }

  // 2. 公開記事のみをフィルタ
  console.log('📢 === 公開済み記事（published） ===');
  const { data: publishedPosts, error: publishedError } = await supabase
    .from('blog_posts')
    .select('title, slug, status, published_at')
    .eq('status', 'published');

  if (publishedError) {
    console.error('❌ エラー:', publishedError);
  } else {
    console.log(`✅ ${publishedPosts?.length || 0}件の公開記事:\n`);
    publishedPosts?.forEach(post => {
      const pubDate = post.published_at ? new Date(post.published_at) : null;
      const now = new Date();
      const isFuture = pubDate && pubDate > now;
      
      console.log(`- ${post.title}`);
      console.log(`  Slug: ${post.slug}`);
      console.log(`  Published at: ${post.published_at || 'NULL'}`);
      if (isFuture) {
        console.log(`  ⚠️ 未来の日付です！`);
      }
      if (!post.published_at) {
        console.log(`  ⚠️ published_atがNULLです！`);
      }
    });
  }

  // 3. カテゴリを確認
  console.log('\n📁 === カテゴリ ===');
  const { data: categories, error: catError } = await supabase
    .from('blog_categories')
    .select('*');

  if (catError) {
    console.error('❌ エラー:', catError);
  } else {
    console.log(`✅ ${categories?.length || 0}件のカテゴリ`);
    categories?.forEach(cat => {
      console.log(`- ${cat.name} (${cat.slug})`);
    });
  }

  // 4. タグを確認
  console.log('\n🏷️ === タグ ===');
  const { data: tags, error: tagError } = await supabase
    .from('blog_tags')
    .select('*');

  if (tagError) {
    console.error('❌ エラー:', tagError);
  } else {
    console.log(`✅ ${tags?.length || 0}件のタグ`);
    tags?.forEach(tag => {
      console.log(`- ${tag.name} (${tag.slug})`);
    });
  }

  // 5. RLSポリシーの確認（公開記事の読み取り）
  console.log('\n🔐 === RLSポリシーテスト ===');
  const { data: publicPosts, error: publicError } = await supabase
    .from('blog_posts')
    .select('title')
    .eq('status', 'published')
    .limit(1);

  if (publicError) {
    console.error('❌ 公開記事の読み取りエラー:', publicError);
  } else {
    console.log('✅ 公開記事の読み取り: OK');
  }

  // 6. 特定のスラッグで検索
  const testSlug = 'eliel-toilet-paper-price-compare-2025';
  console.log(`\n🔎 === スラッグ "${testSlug}" の検索 ===`);
  const { data: specificPost, error: specificError } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', testSlug)
    .single();

  if (specificError) {
    console.error('❌ エラー:', specificError);
  } else if (specificPost) {
    console.log('✅ 記事が見つかりました:');
    console.log(JSON.stringify(specificPost, null, 2));
  } else {
    console.log('⚠️ 記事が見つかりません');
  }
}

debugBlog().then(() => {
  console.log('\n✅ デバッグ完了');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ デバッグ中にエラー:', err);
  process.exit(1);
});