-- Supabaseの警告を修正するSQLスクリプト
-- このスクリプトをSupabaseのSQL Editorで実行してください

-- ============================================
-- 1. Function Search Path の修正
-- ============================================
-- search_pathを明示的に設定して、セキュリティを向上させます

-- update_updated_at_column関数のsearch_path設定
ALTER FUNCTION public.update_updated_at_column() 
SET search_path = public, pg_catalog;

-- update_dishwashing_liquid_updated_at関数のsearch_path設定
ALTER FUNCTION public.update_dishwashing_liquid_updated_at() 
SET search_path = public, pg_catalog;

-- ============================================
-- 検証用クエリ
-- ============================================
-- 以下のクエリで関数の設定を確認できます：

/*
SELECT 
    proname AS function_name,
    prosecdef AS security_definer,
    proconfig AS configuration
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
AND proname IN ('update_updated_at_column', 'update_dishwashing_liquid_updated_at');
*/