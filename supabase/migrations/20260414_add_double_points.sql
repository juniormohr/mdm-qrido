-- Add double_points_active to loyalty_configs
ALTER TABLE public.loyalty_configs ADD COLUMN IF NOT EXISTS double_points_active BOOLEAN DEFAULT false;
