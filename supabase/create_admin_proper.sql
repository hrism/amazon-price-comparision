-- 正しい方法：Supabaseの管理機能を使用
-- SupabaseダッシュボードのAuthenticationタブで以下の操作を行ってください：

/*
1. Supabaseダッシュボードにログイン
2. Authentication → Users タブを開く
3. "Add user" ボタンをクリック
4. 以下の情報を入力：

Email: haruki.ishimaru@gmail.com
Password: UF:~_'xZ~3K`r=eu
Auto Confirm User: チェックを入れる（メール確認をスキップ）

5. "Create user" をクリック

6. 作成後、ユーザーをクリックして "Raw User Meta Data" に以下を追加：
{
  "name": "Haruki Ishimaru",
  "role": "admin"
}

これで管理者権限でログインできます。
*/

-- 確認用クエリ（作成後に実行）
SELECT 
  id,
  email,
  raw_user_meta_data,
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'haruki.ishimaru@gmail.com';