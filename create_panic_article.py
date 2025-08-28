import os
from supabase import create_client
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv('.env.local')

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or 'https://wuehrhqilbxgvdabiiiw.supabase.co'
key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY') or 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZWhyaHFpbGJ4Z3ZkYWJpaWl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNzM0MDAsImV4cCI6MjA3MDg0OTQwMH0.4TKTWUPjYqp--_hA3y90hdaLHzKlKSp3Sq4TFwJUh1k'

if not url or not key:
    print("環境変数が設定されていません")
    exit(1)

supabase = create_client(url, key)

# 記事データ
article_data = {
    'id': '414d15d5-f9f8-4d7e-9d2d-7eb87b2538c8',
    'slug': 'toilet-paper-panic-history',
    'title': 'トイレットペーパーパニックの歴史：1973年から2020年まで',
    'content': '''<h2>はじめに</h2>
<p>トイレットペーパーは日常生活に欠かせない必需品ですが、過去に何度か「買い占め騒動」が起きています。なぜトイレットペーパーが真っ先に買い占められるのでしょうか？その歴史と背景を探ります。</p>

<h2>1973年：第一次オイルショック</h2>
<p><strong>「紙がなくなる」</strong>という噂が日本全国を駆け巡りました。</p>
<ul>
<li>中東戦争による石油危機が発端</li>
<li>大阪のスーパーマーケットから始まった買い占め</li>
<li>わずか2週間で全国に波及</li>
<li>政府が「在庫は十分にある」と発表するも効果なし</li>
</ul>

<h2>2011年：東日本大震災</h2>
<p>震災直後、首都圏を中心に買い占めが発生しました。</p>
<ul>
<li>製紙工場の被災による供給不安</li>
<li>計画停電による物流の混乱</li>
<li>SNSでの情報拡散が拍車をかける</li>
</ul>

<h2>2020年：新型コロナウイルス</h2>
<p>世界的なパンデミックで、各国で同時多発的に買い占めが発生しました。</p>
<ul>
<li>外出自粛要請による不安心理</li>
<li>SNSでの空の棚の画像拡散</li>
<li>「マスクと同じ原料」というデマの流布</li>
<li>オーストラリアから始まり世界中に波及</li>
</ul>

<h2>なぜトイレットペーパーなのか</h2>
<h3>心理的要因</h3>
<ul>
<li><strong>かさばる商品</strong>：棚から無くなりやすく、視覚的インパクトが大きい</li>
<li><strong>必需品</strong>：代替品がなく、なくなると困る</li>
<li><strong>保存がきく</strong>：腐らないため買い溜めしやすい</li>
</ul>

<h3>構造的要因</h3>
<ul>
<li>国内生産率が高く、実は供給は安定している</li>
<li>在庫スペースの関係で店頭在庫が少ない</li>
<li>補充が追いつかないだけで、供給不足ではない</li>
</ul>

<h2>教訓と対策</h2>
<p>歴史は繰り返されますが、以下の点を理解しておくことが重要です：</p>
<ol>
<li><strong>日本のトイレットペーパーは98%が国内生産</strong></li>
<li><strong>メーカーの在庫は常に1ヶ月分以上確保されている</strong></li>
<li><strong>買い占めは一時的な品薄を生むだけ</strong></li>
</ol>

<h2>賢い備蓄のすすめ</h2>
<p>パニック買いではなく、日頃からの適切な備蓄が大切です。</p>
<ul>
<li>通常使用量の2-3週間分を目安に</li>
<li>ローリングストック法で管理</li>
<li>単価を比較して賢く購入（当サイトの価格比較ツールをご活用ください）</li>
</ul>

<h2>まとめ</h2>
<p>トイレットペーパーパニックは、不安心理が生み出す集団行動です。正確な情報を知り、冷静に対処することが重要です。当サイトの価格比較ツールを使って、平常時から賢く買い物をすることで、いざという時にも慌てずに済みます。</p>

<blockquote>
<p>💡 <strong>豆知識</strong>：日本のトイレットペーパー消費量は年間約100万トン。これは東京ドーム約2個分の体積に相当します。</p>
</blockquote>''',
    'excerpt': '1973年のオイルショックから2020年のコロナ禍まで、なぜトイレットペーパーは買い占められるのか？その歴史と心理を解説します。',
    'status': 'scheduled',
    'published_at': '2025-08-28T14:00:00+09:00',  # 本日14時に公開予定
    'meta_title': 'トイレットペーパーパニックの歴史と教訓｜なぜ買い占めが起きるのか',
    'meta_description': '1973年オイルショック、2011年東日本大震災、2020年コロナ禍。トイレットペーパー買い占めの歴史と心理的背景を詳しく解説。賢い備蓄方法もご紹介。',
    'meta_keywords': 'トイレットペーパー,パニック,買い占め,オイルショック,コロナ,備蓄',
    'category_id': 1,  # トイレットペーパーカテゴリ
    'view_count': 0,
    'created_at': datetime.now(timezone.utc).isoformat(),
    'updated_at': datetime.now(timezone.utc).isoformat()
}

# 記事を挿入
try:
    # 既存の記事を確認
    existing = supabase.table('blog_posts').select('id').eq('slug', 'toilet-paper-panic-history').execute()
    
    if existing.data and len(existing.data) > 0:
        print(f"記事が既に存在します: {existing.data[0]['id']}")
        # 更新
        result = supabase.table('blog_posts').update(article_data).eq('slug', 'toilet-paper-panic-history').execute()
        print("記事を更新しました")
    else:
        # 新規作成
        result = supabase.table('blog_posts').insert(article_data).execute()
        print("記事を作成しました")
    
    print(f"Slug: {article_data['slug']}")
    print(f"Status: {article_data['status']}")
    print(f"Published at: {article_data['published_at']}")
    
except Exception as e:
    print(f"エラー: {e}")