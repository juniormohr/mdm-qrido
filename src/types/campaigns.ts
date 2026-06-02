export type CampaignStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type CampaignPriority = 'low' | 'medium' | 'high' | 'critical';
export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';

export interface Campaign {
  id: string;
  company_id: string;
  name: string;
  type: string;
  start_date: string;
  end_date: string;
  status: CampaignStatus;
  priority: CampaignPriority;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignTemplate {
  id: string;
  company_id?: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface CampaignTemplateStep {
  id: string;
  template_id: string;
  name: string;
  category: string;
  days_offset: number;
  color: string;
  order_index: number;
}

export interface CampaignStep {
  id: string;
  campaign_id: string;
  name: string;
  category: string;
  status: StepStatus;
  target_date: string;
  assignee_id?: string;
  color: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignDependency {
  id: string;
  step_id: string;
  depends_on_step_id: string;
}
