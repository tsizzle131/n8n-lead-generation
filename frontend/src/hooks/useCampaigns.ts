import { useQuery } from '@tanstack/react-query';

export interface Campaign {
  id: string;
  name: string;
  location: string;
  keywords: string[];
  status: 'draft' | 'running' | 'completed' | 'failed' | 'paused';
  coverage_profile: string;
  target_zip_count: number;
  estimated_cost: number;
  started_at?: string;
  completed_at?: string;
  estimated_completion?: string;
  total_businesses_found?: number;
  total_emails_found?: number;
  total_facebook_pages_found?: number;
  total_linkedin_profiles_found?: number;
  linkedin_verified_emails?: number;
  linkedin_deliverable_emails?: number;
  linkedin_risky_emails?: number;
  linkedin_undeliverable_emails?: number;
  actual_cost?: number;
  created_at: string;
  progress?: number;
}

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async (): Promise<Campaign[]> => {
      const response = await fetch('/api/gmaps/campaigns');
      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }
      const data = await response.json();
      return data.campaigns || [];
    },
    refetchInterval: (query) => {
      const campaigns = query.state.data || [];

      // Only poll if there are running campaigns
      const hasRunningCampaigns = campaigns.some((c: Campaign) => c.status === 'running');

      return hasRunningCampaigns ? 30000 : false; // 30s if running, else stop
    },
    refetchIntervalInBackground: false,
  });
}
