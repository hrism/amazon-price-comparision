-- Create rice_products table
CREATE TABLE IF NOT EXISTS public.rice_products (
    id SERIAL PRIMARY KEY,
    asin VARCHAR(255) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    brand VARCHAR(255),
    price NUMERIC(10, 2),
    price_regular NUMERIC(10, 2),
    price_fresh NUMERIC(10, 2),
    price_fresh_regular NUMERIC(10, 2),
    is_fresh_available BOOLEAN DEFAULT FALSE,
    review_avg NUMERIC(3, 2),
    review_count INTEGER,
    image_url TEXT,
    description TEXT,
    weight_kg NUMERIC(10, 2),
    price_per_kg NUMERIC(10, 2),
    price_per_kg_fresh NUMERIC(10, 2),
    rice_type VARCHAR(255),
    is_musenmai BOOLEAN DEFAULT FALSE,
    discount_percent NUMERIC(5, 2),
    discount_percent_fresh NUMERIC(5, 2),
    on_sale BOOLEAN DEFAULT FALSE,
    last_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_rice_products_asin ON public.rice_products(asin);
CREATE INDEX IF NOT EXISTS idx_rice_products_price_per_kg ON public.rice_products(price_per_kg);
CREATE INDEX IF NOT EXISTS idx_rice_products_price_per_kg_fresh ON public.rice_products(price_per_kg_fresh);
CREATE INDEX IF NOT EXISTS idx_rice_products_last_fetched ON public.rice_products(last_fetched_at DESC);

-- Enable RLS
ALTER TABLE public.rice_products ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read access" ON public.rice_products
    FOR SELECT
    USING (true);

-- Create policy for authenticated write access (for admin)
CREATE POLICY "Allow authenticated write access" ON public.rice_products
    FOR ALL
    USING (auth.role() = 'authenticated');