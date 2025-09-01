import { TwitterApi } from 'twitter-api-v2';

// Twitter API クライアントの初期化
export function getTwitterClient() {
  const appKey = process.env.TWITTER_API_KEY;
  const appSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    console.error('Twitter API credentials are not configured');
    return null;
  }

  return new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  });
}

// ブログ記事をTwitterに投稿
export async function postToTwitter(
  title: string,
  excerpt: string,
  url: string,
  category?: string
): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  try {
    const client = getTwitterClient();
    
    if (!client) {
      return { 
        success: false, 
        error: 'Twitter API is not configured' 
      };
    }

    // ツイート本文を作成（280文字制限を考慮）
    let tweetText = `📝 ブログ更新しました！\n\n「${title}」\n\n`;
    
    // 抜粋を追加（文字数制限を考慮）
    const maxExcerptLength = 180 - tweetText.length - url.length - 10; // URLと余白分を確保
    if (excerpt && excerpt.length > maxExcerptLength) {
      tweetText += excerpt.substring(0, maxExcerptLength) + '...';
    } else if (excerpt) {
      tweetText += excerpt;
    }
    
    // カテゴリに応じたハッシュタグを追加
    const hashtags = getHashtagsByCategory(category);
    tweetText += '\n\n' + hashtags;
    
    // URLを追加
    tweetText += '\n' + url;

    // ツイートを投稿
    const v2Client = client.v2;
    const tweet = await v2Client.tweet(tweetText);

    console.log('Successfully posted to Twitter:', tweet.data.id);
    
    return {
      success: true,
      tweetId: tweet.data.id
    };
  } catch (error: any) {
    console.error('Failed to post to Twitter:', error);
    return {
      success: false,
      error: error.message || 'Failed to post to Twitter'
    };
  }
}

// カテゴリに応じたハッシュタグを生成
function getHashtagsByCategory(category?: string): string {
  const baseHashtags = '#節約 #お得情報 #価格比較';
  
  const categoryHashtags: Record<string, string> = {
    'toilet-paper': '#トイレットペーパー #日用品',
    'dishwashing-liquid': '#食器用洗剤 #キッチン用品',
    'mineral-water': '#ミネラルウォーター #飲料',
    'rice': '#お米 #食品',
    'saving-tips': '#節約術 #家計管理',
    'price-trends': '#価格動向 #インフレ対策'
  };

  const additionalTags = categoryHashtags[category || ''] || '';
  
  return `${baseHashtags} ${additionalTags}`.trim();
}

// スケジュール投稿用の関数
export async function postScheduledTweet(
  postId: number,
  title: string,
  excerpt: string,
  slug: string,
  category?: string
): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.yasu-ku-kau.com';
  const url = `${baseUrl}/blog/${slug}`;
  
  const result = await postToTwitter(title, excerpt, url, category);
  
  if (result.success && result.tweetId) {
    console.log(`Tweet posted for blog post ${postId}: ${result.tweetId}`);
    // 必要に応じてツイートIDをデータベースに保存
  }
  
  return result.success;
}