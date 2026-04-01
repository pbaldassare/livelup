
ALTER TYPE public.coupon_type ADD VALUE IF NOT EXISTS 'free_months';

ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS free_months INTEGER;
