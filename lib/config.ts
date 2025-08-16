// 環境設定
export const config = {
  // API エンドポイント
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || (
      process.env.NODE_ENV === 'production' 
        ? '/api'  // Vercel Functions を使用
        : 'http://localhost:8000'  // ローカル開発
    ),
  },
  
  // Supabase設定
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  
  // Amazon設定
  amazon: {
    partnerTag: process.env.NEXT_PUBLIC_AMAZON_PARTNER_TAG || 'electlicdista-22',
  },
  
  // 開発環境判定
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// API URLヘルパー
export const getApiUrl = (path: string) => {
  const baseUrl = config.api.baseUrl;
  // パスが / で始まらない場合は追加
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Vercel Functions の場合はそのまま返す
  if (baseUrl === '/api') {
    return `/api${normalizedPath}`;
  }
  
  // 外部APIの場合
  return `${baseUrl}${normalizedPath}`;
};