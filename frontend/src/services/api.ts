import axios from 'axios';

// For local development, we'll use the FastAPI backend on port 8000
// You can alternatively create a simple Express.js backend if preferred
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 3600000, // 60 minutes - longer than backend timeouts to prevent frontend cancellation
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    if (config.url?.includes('/run-script')) {
      console.log(`⏳ Starting long-running Apollo scrape - this may take up to 30 minutes...`);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
api.interceptors.response.use(
  (response) => {
    if (response.config.url?.includes('/run-script')) {
      console.log(`✅ Apollo scrape request completed successfully`);
    }
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      code: error.code
    });
    
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.error('🚨 Request timed out - this should not happen with Apollo scrapes');
    }
    
    return Promise.reject(error);
  }
);

export interface APIKeys {
  openai_api_key?: string;
  apify_api_key?: string;
  bouncer_api_key?: string;
  vapi_api_key?: string;
  linkedin_actor_id?: string;
}

export interface Settings {
  ai_model_summary: string;
  ai_model_icebreaker: string;
  ai_temperature: number;
  delay_between_ai_calls: number;
}

export interface Prompts {
  summary: string;
  icebreaker: string;
}

export interface ContactData {
  first_name: string;
  last_name: string;
  headline: string;
  location: string;
  website_summaries: string[];
}

export interface TestRequest {
  contact: ContactData;
  custom_prompts?: Prompts;
  use_current_settings?: boolean;
}

export interface ScriptStatus {
  isRunning: boolean;
  mode: string | null;
  campaignId?: string | null;
  startTime: string | null;
  status: string;
  logCount: number;
  uptime: number;
}

export interface LogEntry {
  timestamp: string;
  type: 'stdout' | 'stderr';
  message: string;
}

export interface ExecutionHistoryItem {
  id: number;
  mode: string;
  startTime: string;
  endTime: string;
  duration: number;
  exitCode: number;
  success: boolean;
  logCount: number;
}

export interface SupabaseSettings {
  url: string;
  key: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  priority?: number;
  tags?: string[];
  audience_id?: string;
  total_urls?: number;
  completed_urls?: number;
  failed_urls?: number;
  total_contacts_found?: number;
  total_leads_generated?: number;
  completion_percentage?: number;
  lead_conversion_percentage?: number;
}

export interface SearchUrl {
  id: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  campaign_id?: string;
  created_at: string;
  processed_at?: string;
  total_contacts_found?: number;
  notes?: string;
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  status?: 'active' | 'paused' | 'completed' | 'archived';
  tags?: string[];
  priority?: number;
  audience_id?: string | null;
}

export interface AddUrlToCampaignRequest {
  url: string;
  notes?: string;
}


export const apiService = {
  // API Keys
  async getApiKeys(): Promise<APIKeys> {
    const response = await api.get('/api-keys');
    return response.data;
  },

  async updateApiKeys(apiKeys: APIKeys): Promise<void> {
    await api.post('/api-keys', apiKeys);
  },

  // Settings
  async getSettings(): Promise<Settings> {
    const response = await api.get('/settings');
    return response.data;
  },

  async updateSettings(settings: Settings): Promise<void> {
    await api.post('/settings', settings);
  },

  // Prompts
  async getPrompts(): Promise<Prompts> {
    const response = await api.get('/prompts');
    return response.data;
  },

  async updatePrompts(prompts: Prompts): Promise<void> {
    await api.post('/prompts', prompts);
  },

  // Testing
  async testConnection(): Promise<{ status: string; message: string }> {
    const response = await api.post('/test-connection');
    return response.data;
  },

  async generateIcebreaker(request: TestRequest): Promise<any> {
    const response = await api.post('/generate-icebreaker', request);
    return response.data;
  },

  async getSampleData(): Promise<{ contacts: ContactData[] }> {
    const response = await api.get('/sample-data');
    return response.data;
  },

  // Script Execution
  async runScript(mode: string, testUrl?: string, recordCount?: number): Promise<any> {
    const response = await api.post('/run-script', { mode, testUrl, recordCount });
    return response.data;
  },

  async getScriptStatus(): Promise<ScriptStatus> {
    const response = await api.get('/script-status');
    return response.data;
  },

  async stopScript(): Promise<any> {
    const response = await api.post('/stop-script');
    return response.data;
  },

  async getScriptLogs(since?: string): Promise<{ logs: LogEntry[]; totalCount: number; isRunning: boolean; status: string }> {
    const params = since ? { since } : {};
    const response = await api.get('/script-logs', { params });
    return response.data;
  },

  async getExecutionHistory(): Promise<{ history: ExecutionHistoryItem[]; currentExecution: any }> {
    const response = await api.get('/execution-history');
    return response.data;
  },

  // Supabase Settings
  async getSupabaseSettings(): Promise<SupabaseSettings> {
    const response = await api.get('/supabase');
    return response.data;
  },

  async updateSupabaseSettings(settings: SupabaseSettings): Promise<void> {
    await api.post('/supabase', settings);
  },

  async testSupabaseConnection(): Promise<{ status: string; message: string }> {
    const response = await api.post('/test-supabase');
    return response.data;
  },

  // Campaign Management
  async getCampaigns(): Promise<{ campaigns: Campaign[] }> {
    const response = await api.get('/campaigns');
    return response.data;
  },

  async createCampaign(campaignData: CreateCampaignRequest): Promise<{ campaign: Campaign }> {
    const response = await api.post('/campaigns', campaignData);
    return response.data;
  },

  async updateCampaign(campaignId: string, updates: Partial<CreateCampaignRequest>): Promise<{ campaign: Campaign }> {
    const response = await api.put(`/campaigns/${campaignId}`, updates);
    return response.data;
  },

  async deleteCampaign(campaignId: string): Promise<{ message: string }> {
    const response = await api.delete(`/campaigns/${campaignId}`);
    return response.data;
  },

  async getCampaignUrls(campaignId: string): Promise<{ urls: SearchUrl[] }> {
    const response = await api.get(`/campaigns/${campaignId}/urls`);
    return response.data;
  },

  async addUrlToCampaign(campaignId: string, urlData: AddUrlToCampaignRequest): Promise<{ url: SearchUrl }> {
    const response = await api.post(`/campaigns/${campaignId}/urls`, urlData);
    return response.data;
  },

  async removeUrlFromCampaign(campaignId: string, urlId: string): Promise<{ message: string }> {
    const response = await api.delete(`/campaigns/${campaignId}/urls/${urlId}`);
    return response.data;
  },

  async runCampaign(campaignId: string, recordCount?: number): Promise<any> {
    const response = await api.post('/run-script', { 
      mode: 'campaign', 
      campaignId,
      recordCount 
    });
    return response.data;
  },

  // Organization Management
  async getOrganizations(): Promise<{ organizations: any[] }> {
    const response = await api.get('/organizations');
    return response.data;
  },

  async createOrganization(orgData: { name: string; slug: string; description?: string; contact_email?: string; subscription_plan?: string }): Promise<{ organization: any }> {
    const response = await api.post('/organizations', orgData);
    return response.data;
  },

  async updateOrganization(orgId: string, updates: any): Promise<{ organization: any }> {
    const response = await api.put(`/organizations/${orgId}`, updates);
    return response.data;
  },

  async deleteOrganization(orgId: string): Promise<{ message: string }> {
    const response = await api.delete(`/organizations/${orgId}`);
    return response.data;
  },

  async getCurrentOrganization(): Promise<{ organizationId: string | null; organization: any | null }> {
    const response = await api.get('/current-organization');
    return response.data;
  },

  async setCurrentOrganization(organizationId: string): Promise<{ message: string; organizationId: string }> {
    const response = await api.post('/set-organization', { organizationId });
    return response.data;
  },

  // Organization-specific API Keys and Settings
  async getOrganizationApiKeys(orgId: string): Promise<{ openai_api_key: string | null; apify_api_key: string | null }> {
    const response = await api.get(`/organizations/${orgId}/api-keys`);
    return response.data;
  },

  async updateOrganizationApiKeys(orgId: string, apiKeys: { openai_api_key?: string; apify_api_key?: string }): Promise<{ message: string }> {
    const response = await api.post(`/organizations/${orgId}/api-keys`, apiKeys);
    return response.data;
  },

  async getOrganizationSettings(orgId: string): Promise<any> {
    const response = await api.get(`/organizations/${orgId}/settings`);
    return response.data;
  },

  async updateOrganizationSettings(orgId: string, settings: any): Promise<{ message: string }> {
    const response = await api.post(`/organizations/${orgId}/settings`, settings);
    return response.data;
  },

  async getOrganizationUsage(orgId: string, month?: string, year?: string): Promise<{ usage: any[]; summary: any; period: any }> {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    
    const response = await api.get(`/organizations/${orgId}/usage?${params.toString()}`);
    return response.data;
  },


  // Audience Management
  async getAudiences(): Promise<{ audiences: any[] }> {
    const response = await api.get('/audiences');
    return response.data;
  },

  async createAudience(audienceData: { name: string; description?: string }): Promise<{ audience: any }> {
    const response = await api.post('/audiences', audienceData);
    return response.data;
  },

  async getAudienceUrls(audienceId: string): Promise<{ urls: any[] }> {
    const response = await api.get(`/audiences/${audienceId}/urls`);
    return response.data;
  },

  async addUrlToAudience(audienceId: string, urlData: { url: string; notes?: string }): Promise<{ message: string }> {
    const response = await api.post(`/audiences/${audienceId}/urls`, urlData);
    return response.data;
  },

  async scrapeAudience(audienceId: string, recordCount?: number): Promise<{ message: string; audienceId: string; urlCount: number; firstUrl: string; status: string }> {
    const response = await api.post(`/audiences/${audienceId}/scrape`, { recordCount });
    return response.data;
  },

  async deleteAudience(audienceId: string): Promise<{ message: string }> {
    const response = await api.delete(`/audiences/${audienceId}`);
    return response.data;
  },

  async getAudienceContacts(audienceId: string): Promise<{ contacts: any[] }> {
    const response = await api.get(`/audiences/${audienceId}/contacts`);
    return response.data;
  },

};

export default apiService;