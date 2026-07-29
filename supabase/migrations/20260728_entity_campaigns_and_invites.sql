-- Migration for Entity Campaigns and Invites
-- Date: 2026-07-28

-- 1. Table for Campaigns per Entity (Group/Holding)
CREATE TABLE IF NOT EXISTS public.entity_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    double_points BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on entity_campaigns
ALTER TABLE public.entity_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active entity_campaigns" ON public.entity_campaigns
    FOR SELECT USING (is_active = true);

CREATE POLICY "Entities manage their own campaigns" ON public.entity_campaigns
    FOR ALL USING (auth.uid() = entity_id);

-- 2. Update holding_groups status constraint to support 'pending', 'accepted', 'rejected'
DO $$ 
BEGIN
    ALTER TABLE public.holding_groups DROP CONSTRAINT IF EXISTS holding_groups_status_check;
    ALTER TABLE public.holding_groups 
    ADD CONSTRAINT holding_groups_status_check 
    CHECK (status IN ('pending', 'accepted', 'rejected', 'active', 'inactive'));
END $$;
