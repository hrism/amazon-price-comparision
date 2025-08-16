-- Supabase管理者ユーザー作成
-- SupabaseダッシュボードのSQL Editorで実行してください

-- 管理者ユーザー追加
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@example.com',  -- ここを実際のメールアドレスに変更
  crypt('AdminPassword123!', gen_salt('bf')),  -- ここを実際のパスワードに変更
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Admin User","role":"admin"}',  -- 管理者権限
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- 編集者ユーザー追加例
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'editor@example.com',  -- 編集者のメールアドレス
  crypt('EditorPassword123!', gen_salt('bf')),  -- 編集者のパスワード
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Editor User","role":"editor"}',  -- 編集者権限
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- 確認用クエリ
SELECT 
  email,
  raw_user_meta_data->>'name' as name,
  raw_user_meta_data->>'role' as role,
  email_confirmed_at,
  created_at
FROM auth.users 
ORDER BY created_at DESC;