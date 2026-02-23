-- Create purchase_requests table for Carrinho de Pontos
-- Date: 2026-02-23

CREATE TABLE IF NOT EXISTS public.purchase_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    items JSONB NOT NULL, -- Array of objects: {id, name, qty, price, points}
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_points INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'completed', 'rejected')) DEFAULT 'pending',
    verification_code CHAR(4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own purchase requests" ON public.purchase_requests
    FOR SELECT USING (auth.uid() = customer_profile_id OR auth.uid() = company_id);

CREATE POLICY "Customers can create purchase requests" ON public.purchase_requests
    FOR INSERT WITH CHECK (auth.uid() = customer_profile_id);

CREATE POLICY "Companies can update their requests (confirm/reject/update code)" ON public.purchase_requests
    FOR UPDATE USING (auth.uid() = company_id);

CREATE POLICY "Customers can update their requests to completed" ON public.purchase_requests
    FOR UPDATE USING (auth.uid() = customer_profile_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_requests;
