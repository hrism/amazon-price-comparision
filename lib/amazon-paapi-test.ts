// Amazon PA-APIの接続テスト用スクリプト
import AmazonPAAPI from './amazon-paapi';

async function testConnection() {
  console.log('Amazon PA-API 接続テスト開始...');
  
  const api = new AmazonPAAPI();
  
  try {
    console.log('検索実行中...');
    const results = await api.searchItems('トイレットペーパー');
    console.log(`成功！ ${results.length}件の商品が見つかりました。`);
    
    if (results.length > 0) {
      console.log('\n最初の商品:');
      console.log('- ASIN:', results[0].asin);
      console.log('- タイトル:', results[0].title);
      console.log('- 価格:', results[0].price);
    }
  } catch (error: any) {
    console.error('\nエラー詳細:');
    console.error('- メッセージ:', error.message);
    if (error.response) {
      console.error('- ステータス:', error.response.status);
      console.error('- レスポンス:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 環境変数を確認
console.log('環境変数チェック:');
console.log('- AMAZON_ACCESS_KEY:', process.env.AMAZON_ACCESS_KEY ? '設定済み' : '未設定');
console.log('- AMAZON_SECRET_KEY:', process.env.AMAZON_SECRET_KEY ? '設定済み' : '未設定');
console.log('- AMAZON_PARTNER_TAG:', process.env.AMAZON_PARTNER_TAG || '未設定');

testConnection();