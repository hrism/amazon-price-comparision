-- Add mask_size column to mask_products table
ALTER TABLE mask_products 
ADD COLUMN IF NOT EXISTS mask_size text;