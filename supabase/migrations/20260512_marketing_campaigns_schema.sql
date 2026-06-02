-- Migrations for Marketing Campaigns Module

-- 1. Campaigns Table
CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Campaign Templates
CREATE TABLE public.campaign_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- If null, it's a global template
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Campaign Template Steps
CREATE TABLE public.campaign_template_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES public.campaign_templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    days_offset INTEGER NOT NULL, -- Days relative to start_date. e.g. -30 is 30 days before
    color TEXT DEFAULT '#3b82f6',
    order_index INTEGER NOT NULL DEFAULT 0
);

-- 4. Campaign Steps (The actual tasks generated)
CREATE TABLE public.campaign_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed')),
    target_date DATE NOT NULL,
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    color TEXT DEFAULT '#3b82f6',
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Campaign Dependencies
CREATE TABLE public.campaign_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    step_id UUID NOT NULL REFERENCES public.campaign_steps(id) ON DELETE CASCADE,
    depends_on_step_id UUID NOT NULL REFERENCES public.campaign_steps(id) ON DELETE CASCADE,
    UNIQUE(step_id, depends_on_step_id)
);

-- Row Level Security (RLS) Setup

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_template_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_dependencies ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Admins and Company members can see their campaigns)

CREATE POLICY "Users can view their company's campaigns" ON public.campaigns
    FOR SELECT USING (
        company_id = auth.uid() OR 
        company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can insert campaigns for their company" ON public.campaigns
    FOR INSERT WITH CHECK (
        company_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can update their company's campaigns" ON public.campaigns
    FOR UPDATE USING (
        company_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Templates Policies
CREATE POLICY "Users can view templates" ON public.campaign_templates
    FOR SELECT USING (
        company_id IS NULL OR 
        company_id = auth.uid() OR 
        company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can view template steps" ON public.campaign_template_steps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.campaign_templates ct
            WHERE ct.id = template_id AND (
                ct.company_id IS NULL OR 
                ct.company_id = auth.uid() OR 
                ct.company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
                EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            )
        )
    );

-- Campaign Steps Policies
CREATE POLICY "Users can view campaign steps" ON public.campaign_steps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_id AND (
                c.company_id = auth.uid() OR 
                c.company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
                EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            )
        )
    );

CREATE POLICY "Users can insert campaign steps" ON public.campaign_steps
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_id AND (
                c.company_id = auth.uid() OR
                EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            )
        )
    );

CREATE POLICY "Users can update campaign steps" ON public.campaign_steps
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_id AND (
                c.company_id = auth.uid() OR
                EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            )
        )
    );

-- Campaign Dependencies Policies
CREATE POLICY "Users can view campaign dependencies" ON public.campaign_dependencies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.campaign_steps cs
            JOIN public.campaigns c ON cs.campaign_id = c.id
            WHERE cs.id = step_id AND (
                c.company_id = auth.uid() OR 
                c.company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
                EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            )
        )
    );

CREATE POLICY "Users can insert campaign dependencies" ON public.campaign_dependencies
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.campaign_steps cs
            JOIN public.campaigns c ON cs.campaign_id = c.id
            WHERE cs.id = step_id AND (
                c.company_id = auth.uid() OR
                EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            )
        )
    );

-- Realtime Setup (Enable for dynamic UI updates)
alter publication supabase_realtime add table public.campaigns;
alter publication supabase_realtime add table public.campaign_steps;
alter publication supabase_realtime add table public.campaign_dependencies;
