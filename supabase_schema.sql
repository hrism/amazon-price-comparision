-- Supabaseで実行するSQL
-- productsテーブルの作成

create table if not exists products (
    id uuid primary key default gen_random_uuid(),
    asin text not null unique,
    title text not null,
    description text,
    brand text,
    image_url text,
    price integer,                -- 販売価格（セール適用後）
    price_regular integer,        -- 通常価格（割引前）
    discount_percent integer,     -- 割引率
    on_sale boolean default false, -- セール中フラグ
    review_avg numeric(2,1),
    review_count integer,
    roll_count integer,
    length_m numeric(5,1),
    total_length_m numeric(7,1),
    price_per_roll numeric(7,2),
    price_per_m numeric(7,3),
    is_double boolean,
    last_fetched_at timestamp with time zone default now(),
    created_at timestamp with time zone default now()
);

-- インデックスの作成
create index idx_products_asin on products(asin);
create index idx_products_price_per_m on products(price_per_m);
create index idx_products_price_per_roll on products(price_per_roll);
create index idx_products_on_sale on products(on_sale);
create index idx_products_is_double on products(is_double);
create index idx_products_last_fetched_at on products(last_fetched_at);