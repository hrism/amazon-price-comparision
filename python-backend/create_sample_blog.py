#!/usr/bin/env python
import os
import django
from django.conf import settings
from django.utils import timezone

# Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_settings')
django.setup()

from django.contrib.auth.models import User
from app.models import Category, Tag, BlogPost

def create_sample_data():
    # Get admin user
    admin_user = User.objects.get(username='admin')
    
    # Create categories
    tech_category, _ = Category.objects.get_or_create(
        name='テクノロジー',
        defaults={
            'slug': 'technology',
            'description': 'テクノロジーに関する最新情報'
        }
    )
    
    lifestyle_category, _ = Category.objects.get_or_create(
        name='ライフスタイル',
        defaults={
            'slug': 'lifestyle', 
            'description': '日常生活を豊かにするヒント'
        }
    )
    
    # Create tags
    ai_tag, _ = Tag.objects.get_or_create(
        name='AI',
        defaults={'slug': 'ai'}
    )
    
    shopping_tag, _ = Tag.objects.get_or_create(
        name='ショッピング',
        defaults={'slug': 'shopping'}
    )
    
    price_tag, _ = Tag.objects.get_or_create(
        name='価格比較',
        defaults={'slug': 'price-comparison'}
    )
    
    # Create sample blog posts
    post1, created1 = BlogPost.objects.get_or_create(
        slug='ai-price-comparison-revolution',
        defaults={
            'title': 'AIが変える価格比較の未来',
            'content': '''
            <h2>はじめに</h2>
            <p>人工知能（AI）の技術革新により、価格比較サービスは大きく進化しています。従来の単純な価格表示から、より賢い比較システムへと変貌を遂げています。</p>
            
            <h2>AIによる価格分析の進化</h2>
            <p>当サイトでも採用しているように、AIは商品情報の自動解析において重要な役割を果たしています：</p>
            <ul>
            <li>商品タイトルからの数量自動抽出</li>
            <li>単価計算の自動化</li>
            <li>レビュー分析による品質評価</li>
            </ul>
            
            <h2>ユーザーメリット</h2>
            <p>これらの技術により、消費者は以下のメリットを享受できます：</p>
            <ol>
            <li><strong>正確な比較</strong>: ミスのない単価計算</li>
            <li><strong>時間短縮</strong>: 手動計算が不要</li>
            <li><strong>賢い選択</strong>: データに基づいた購入判断</li>
            </ol>
            
            <h2>まとめ</h2>
            <p>AIを活用した価格比較は、まだ始まったばかりです。今後さらに精度が向上し、消費者の購買体験が向上することが期待されます。</p>
            ''',
            'excerpt': 'AIが価格比較サービスにもたらす革新と、消費者が得られるメリットについて詳しく解説します。',
            'status': 'published',
            'author': admin_user,
            'category': tech_category,
            'published_at': timezone.now(),
            'meta_title': 'AIが変える価格比較の未来 | 最新テクノロジー解説',
            'meta_description': 'AI技術が価格比較サービスに与える影響と、消費者が得られるメリットを詳しく解説。自動化された価格分析の仕組みを理解しましょう。',
            'meta_keywords': 'AI,価格比較,人工知能,テクノロジー,自動化'
        }
    )
    
    if created1:
        post1.tags.add(ai_tag, price_tag)
    
    post2, created2 = BlogPost.objects.get_or_create(
        slug='smart-toilet-paper-shopping-guide',
        defaults={
            'title': '賢いトイレットペーパーの選び方：単価計算のコツ',
            'content': '''
            <h2>トイレットペーパー選びの重要性</h2>
            <p>日用品の中でも特に消費頻度が高いトイレットペーパー。正しい選び方を知ることで、年間で大きな節約につながります。</p>
            
            <h2>単価計算のポイント</h2>
            <h3>1. ロール単価を確認</h3>
            <p>商品価格をロール数で割った「1ロール単価」が基本の比較指標です。</p>
            
            <h3>2. メートル単価がより重要</h3>
            <p>ロールごとの長さが異なるため、「1メートル単価」での比較がより正確です。</p>
            
            <h3>3. シングル vs ダブル</h3>
            <p>ダブルは2倍の厚さですが、価格も考慮して選択しましょう：</p>
            <ul>
            <li>シングル: 長さ重視、コスパ良好</li>
            <li>ダブル: 使用感重視、若干割高</li>
            </ul>
            
            <h2>購入タイミングの最適化</h2>
            <p>まとめ買いのメリット：</p>
            <ol>
            <li>送料の節約</li>
            <li>セール価格での購入</li>
            <li>買い物頻度の削減</li>
            </ol>
            
            <h2>まとめ</h2>
            <p>当サイトの価格比較機能を使って、メートル単価を基準に選ぶことで、最もお得なトイレットペーパーを見つけることができます。</p>
            ''',
            'excerpt': 'トイレットペーパーを購入する際の単価計算方法と、最もお得な商品を見つけるコツを詳しく解説します。',
            'status': 'published',
            'author': admin_user,
            'category': lifestyle_category,
            'published_at': timezone.now(),
            'meta_title': '賢いトイレットペーパーの選び方 | 単価計算で節約',
            'meta_description': 'トイレットペーパーの単価計算方法とお得な選び方を詳しく解説。メートル単価での比較で年間数千円の節約が可能です。',
            'meta_keywords': 'トイレットペーパー,単価計算,節約,価格比較,日用品'
        }
    )
    
    if created2:
        post2.tags.add(shopping_tag, price_tag)
    
    post3, created3 = BlogPost.objects.get_or_create(
        slug='amazon-price-tracking-tips',
        defaults={
            'title': 'Amazon価格変動を賢く活用する方法',
            'content': '''
            <h2>Amazon価格の特徴を理解する</h2>
            <p>Amazonの価格は需要と供給、競合他社の価格などにより常に変動しています。この変動パターンを理解することで、よりお得に買い物ができます。</p>
            
            <h2>価格変動のパターン</h2>
            <h3>時間による変動</h3>
            <ul>
            <li><strong>平日 vs 週末</strong>: 需要の違いによる価格差</li>
            <li><strong>朝 vs 夜</strong>: アクセス数による影響</li>
            <li><strong>月初 vs 月末</strong>: 給与日前後での需要変化</li>
            </ul>
            
            <h3>季節要因</h3>
            <ul>
            <li>セール期間（プライムデー、ブラックフライデー等）</li>
            <li>在庫処分セール</li>
            <li>新商品発売に伴う既存商品の値下げ</li>
            </ul>
            
            <h2>お得に購入するコツ</h2>
            <h3>1. 価格履歴をチェック</h3>
            <p>当サイトのような価格比較サービスを利用して、過去の価格推移を確認しましょう。</p>
            
            <h3>2. セール情報の活用</h3>
            <p>Amazonのセール情報：</p>
            <ol>
            <li>プライムデー（年2回）</li>
            <li>ブラックフライデー</li>
            <li>サイバーマンデー</li>
            <li>年末年始セール</li>
            </ol>
            
            <h3>3. まとめ買いのタイミング</h3>
            <p>日用品は以下のタイミングでまとめ買いがお得：</p>
            <ul>
            <li>大型セール期間中</li>
            <li>送料無料ライン到達時</li>
            <li>ポイント還元率アップ期間</li>
            </ul>
            
            <h2>注意点</h2>
            <p>価格だけでなく以下の要素も考慮しましょう：</p>
            <ul>
            <li>商品の品質（レビュー評価）</li>
            <li>配送日数</li>
            <li>返品・交換ポリシー</li>
            </ul>
            
            <h2>まとめ</h2>
            <p>Amazon価格の変動パターンを理解し、適切なタイミングで購入することで、年間で大きな節約効果が期待できます。</p>
            ''',
            'excerpt': 'Amazonの価格変動パターンを理解し、最適なタイミングで購入するためのコツを詳しく解説します。',
            'status': 'published',
            'author': admin_user,
            'category': lifestyle_category,
            'published_at': timezone.now(),
            'meta_title': 'Amazon価格変動を賢く活用する方法 | 節約テクニック',
            'meta_description': 'Amazonの価格変動パターンを分析し、最もお得なタイミングで購入するための実践的なコツを詳しく解説します。',
            'meta_keywords': 'Amazon,価格変動,セール,節約,お得,タイミング'
        }
    )
    
    if created3:
        post3.tags.add(shopping_tag, price_tag)
    
    print("サンプルブログ記事を作成しました:")
    print(f"- {post1.title}")
    print(f"- {post2.title}")
    print(f"- {post3.title}")
    print("\nブログは http://localhost:3000/blog で確認できます")
    print("Django管理画面は http://localhost:8001/admin で確認できます")

if __name__ == '__main__':
    create_sample_data()