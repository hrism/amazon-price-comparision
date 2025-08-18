# Supabase セキュリティ設定ガイド

## 対処が必要なセキュリティ警告

### 1. ❌ エラー: RLS (Row Level Security) が無効
**影響を受けるテーブル:**
- `price_history`
- `toilet_paper_products`
- `dishwashing_liquid_products`

**対処方法:**
1. Supabaseダッシュボードの SQL Editor を開く
2. `/supabase/enable_rls_simple.sql` の内容を実行
3. これにより、読み取り専用のRLSポリシーが適用される

### 2. ⚠️ 警告: Function Search Path が未設定
**影響を受ける関数:**
- `update_updated_at_column`
- `update_dishwashing_liquid_updated_at`

**対処方法:**
1. Supabaseダッシュボードの SQL Editor を開く
2. `/supabase/fix_warnings.sql` の内容を実行
3. これにより、search_pathが明示的に設定される

### 3. ⚠️ 警告: 漏洩パスワード保護が無効
**現状:** HaveIBeenPwnedでの漏洩パスワードチェックが無効

**対処方法:**
1. Supabaseダッシュボード → Authentication → Providers
2. Password セクションの「Enable Leaked Password Protection」をオン
3. これにより、既知の漏洩パスワードが使用できなくなる

**注意:** 現在認証機能を使用していない場合は、この設定は優先度が低い

### 4. ⚠️ 警告: MFA (多要素認証) オプションが不足
**現状:** MFAオプションが有効化されていない

**対処方法:**
1. Supabaseダッシュボード → Authentication → MFA
2. 以下のオプションを有効化:
   - TOTP (Time-based One-Time Password)
   - SMS（必要に応じて）

**注意:** 現在認証機能を使用していない場合は、この設定は優先度が低い

## セキュリティレベルの優先順位

### 🔴 高優先度（即座に対処）
1. **RLSの有効化** - データベースへの不正アクセスを防ぐ
   - `/supabase/enable_rls_simple.sql` を実行

### 🟡 中優先度（推奨）
2. **Function Search Pathの設定** - SQLインジェクション対策
   - `/supabase/fix_warnings.sql` を実行

### 🟢 低優先度（認証機能使用時に対処）
3. **漏洩パスワード保護** - ユーザー認証を実装する場合
4. **MFA設定** - ユーザー認証を実装する場合

## 実行手順

### ステップ1: RLSを有効化
```sql
-- Supabase SQL Editorで実行
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toilet_paper_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dishwashing_liquid_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.price_history
    FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.toilet_paper_products
    FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.dishwashing_liquid_products
    FOR SELECT USING (true);
```

### ステップ2: Function Search Pathを設定
```sql
-- Supabase SQL Editorで実行
ALTER FUNCTION public.update_updated_at_column() 
SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_dishwashing_liquid_updated_at() 
SET search_path = public, pg_catalog;
```

## 動作確認

### RLS有効化後の確認
1. フロントエンド（http://localhost:3000）で商品データが表示される
2. GitHub Actionsでのスクレイピングが正常に動作する

### トラブルシューティング

**データが表示されない場合:**
```sql
-- RLSポリシーの確認
SELECT * FROM pg_policies WHERE tablename IN ('price_history', 'toilet_paper_products', 'dishwashing_liquid_products');
```

**書き込みができない場合:**
- GitHub ActionsやPythonバックエンドがサービスロールキーを使用していることを確認
- 環境変数 `SUPABASE_SERVICE_ROLE_KEY` が正しく設定されているか確認

## 関連ファイル
- `/supabase/enable_rls_simple.sql` - RLS有効化スクリプト
- `/supabase/fix_warnings.sql` - 警告修正スクリプト
- `/supabase/enable_rls.sql` - 詳細なRLS設定（上級者向け）