import { addDays, format, parseISO } from 'date-fns';
import { CampaignTemplateStep, CampaignStep } from '@/types/campaigns';

export function generateReverseSchedule(
  campaignId: string,
  mainDateString: string,
  templateSteps: CampaignTemplateStep[]
): Partial<CampaignStep>[] {
  const mainDate = parseISO(mainDateString);

  return templateSteps.map((step) => {
    // days_offset is usually negative (e.g., -30 for 30 days before)
    const targetDate = addDays(mainDate, step.days_offset);

    return {
      campaign_id: campaignId,
      name: step.name,
      category: step.category,
      status: 'pending',
      target_date: format(targetDate, 'yyyy-MM-dd'),
      color: step.color,
      order_index: step.order_index,
    };
  });
}
