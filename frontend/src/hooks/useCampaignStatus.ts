import { useQuery } from '@tanstack/react-query';

interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'completed' | 'failed' | 'paused';
  started_at?: string;
  completed_at?: string;
  estimated_completion?: string;
  total_businesses_found?: number;
  total_emails_found?: number;
  progress?: number;
}

export function useCampaignStatus(campaignId: string) {
  return useQuery({
    queryKey: ['campaign', campaignId, 'status'],
    queryFn: async (): Promise<Campaign> => {
      const response = await fetch(`http://localhost:5001/api/gmaps/campaigns/${campaignId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch campaign status');
      }
      const data = await response.json();
      return data.campaign || data;
    },
    enabled: !!campaignId, // Only run if campaignId exists
    refetchInterval: (query) => {
      const campaign = query.state.data;

      // Stop polling for terminal states
      if (!campaign || ['completed', 'failed'].includes(campaign.status)) {
        return false;
      }

      // Adaptive polling based on time remaining
      if (campaign.estimated_completion) {
        const timeRemaining = new Date(campaign.estimated_completion).getTime() - Date.now();

        if (timeRemaining > 300000) return 30000;  // 30s if > 5 min remaining
        if (timeRemaining > 120000) return 15000;  // 15s if 2-5 min remaining
        return 5000;  // 5s if < 2 min remaining
      }

      // Default: 30 second polling for running campaigns
      return 30000;
    },
    refetchIntervalInBackground: false, // Stop polling when tab not visible
  });
}
