import React, { useState, useEffect, useCallback } from 'react';
import apiService, { Campaign, Prompts } from '../../services/api';

interface Audience {
  id: string;
  name: string;
  description?: string;
  total_urls: number;
  estimated_contacts: number;
  status: 'pending' | 'scraping' | 'ready' | 'error';
  created_at: string;
}

const Campaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scrapingStatus, setScrapingStatus] = useState<{campaignId: string | null; isRunning: boolean}>({campaignId: null, isRunning: false});
  
  // Campaign creation progress tracking
  const [creationProgress, setCreationProgress] = useState<{
    isActive: boolean;
    isMinimized: boolean;
    campaignName: string;
    currentStage: string;
    stages: Array<{
      name: string;
      label: string;
      status: 'pending' | 'active' | 'completed' | 'error';
      progress: number;
      details?: string;
    }>;
    overallProgress: number;
    displayedProgress: number;
    startTime: number | null;
    estimatedTimeRemaining: string;
    progressHistory?: Array<{ time: number; progress: number }>;
    totalContacts?: number;
    currentContact?: number;
  }>({
    isActive: false,
    isMinimized: false,
    campaignName: '',
    currentStage: '',
    stages: [],
    overallProgress: 0,
    displayedProgress: 0,
    startTime: null,
    estimatedTimeRemaining: 'Calculating...',
    progressHistory: []
  });
  
  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAudienceSelector, setShowAudienceSelector] = useState(false);
  const [selectedAudienceId, setSelectedAudienceId] = useState<string>('');
  const [showCreateAudience, setShowCreateAudience] = useState(false);
  const [newAudience, setNewAudience] = useState({ name: '', description: '' });
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    tags: '',
    priority: 0,
    scraperType: 'apollo' as 'apollo' | 'local',
    apolloUrls: '',
    localSearch: {
      query: '',
      location: ''
    },
    autoScrape: false
  });
  
  // Prompt editing states
  const [currentPrompts, setCurrentPrompts] = useState<Prompts>({
    summary: '',
    icebreaker: ''
  });
  const [tempIcebreakerPrompt, setTempIcebreakerPrompt] = useState('');

  const loadCurrentPrompts = useCallback(async () => {
    try {
      const prompts = await apiService.getPrompts();
      setCurrentPrompts(prompts);
    } catch (error: any) {
      showMessage('error', 'Failed to load current prompts');
    }
  }, []);

  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getCampaigns();
      setCampaigns(response.campaigns || []);
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAudiences = useCallback(async () => {
    try {
      const response = await apiService.getAudiences();
      setAudiences(response.audiences || []);
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to load audiences');
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
    loadCurrentPrompts();
    loadAudiences();
  }, [loadCampaigns, loadCurrentPrompts, loadAudiences]);

  const createCampaign = async () => {
    if (!newCampaign.name.trim()) {
      showMessage('error', 'Campaign name is required');
      return;
    }

    let urls: string[] = [];
    
    if (newCampaign.scraperType === 'apollo') {
      if (!newCampaign.apolloUrls.trim()) {
        showMessage('error', 'Apollo URLs are required');
        return;
      }

      // Parse and validate Apollo URLs
      urls = newCampaign.apolloUrls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);
      
      if (urls.length === 0) {
        showMessage('error', 'At least one valid Apollo URL is required');
        return;
      }

      // Basic URL validation for Apollo
      const invalidUrls = urls.filter(url => !url.includes('apollo.io'));
      if (invalidUrls.length > 0) {
        showMessage('error', `Invalid Apollo URLs found: ${invalidUrls.length} URLs don't contain 'apollo.io'`);
        return;
      }
    } else if (newCampaign.scraperType === 'local') {
      // Validate local search parameters
      if (!newCampaign.localSearch.query.trim()) {
        showMessage('error', 'Business type/query is required for local search');
        return;
      }
      
      if (!newCampaign.localSearch.location.trim()) {
        showMessage('error', 'Location is required for local search');
        return;
      }
      
      // Create a special URL format for local searches
      // Simple URL format without radius
      let urlFormat = `local:${newCampaign.localSearch.query}|${newCampaign.localSearch.location}`;
      urls = [urlFormat];
    }

    try {
      setLoading(true);
      
      // Create the campaign
      const response = await apiService.createCampaign({
        name: newCampaign.name,
        description: newCampaign.description,
        tags: newCampaign.tags ? newCampaign.tags.split(',').map(t => t.trim()) : [],
        priority: newCampaign.priority
      });
      
      const createdCampaign = response.campaign;
      
      // Add URLs to the campaign
      showMessage('success', `Campaign created! Adding ${urls.length} Apollo URLs...`);
      
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        try {
          await apiService.addUrlToCampaign(createdCampaign.id, {
            url: url,
            notes: `Added during campaign creation (${i + 1}/${urls.length})`
          });
        } catch (urlError: any) {
          console.warn(`Failed to add URL ${url}:`, urlError);
          showMessage('error', `Warning: Failed to add URL ${i + 1}. Continuing with others...`);
        }
      }
      
      showMessage('success', `✅ Campaign created with ${urls.length} URLs!`);
      
      // Auto-scrape if enabled
      if (newCampaign.autoScrape) {
        // Initialize progress tracking
        const progressStages = [
          { name: 'setup', label: 'Setting up campaign', status: 'completed' as const, progress: 100, details: 'Campaign and URLs created' },
          { name: 'apollo', label: 'Scraping Apollo contacts', status: 'pending' as const, progress: 0 },
          { name: 'websites', label: 'Researching company websites', status: 'pending' as const, progress: 0 },
          { name: 'icebreakers', label: 'Generating AI icebreakers', status: 'pending' as const, progress: 0 }
        ];
        
        setCreationProgress({
          isActive: true,
          isMinimized: false,
          campaignName: newCampaign.name,
          currentStage: 'apollo',
          stages: progressStages,
          overallProgress: 25, // Setup complete
          displayedProgress: 0,
          startTime: Date.now(),
          estimatedTimeRemaining: 'Calculating...',
          progressHistory: []
        });
        
        showMessage('success', '🚀 Starting automatic scraping with progress tracking...');
        
        try {
          await apiService.runCampaign(createdCampaign.id);
          
          // Set the scraping status with the campaign ID
          setScrapingStatus({ campaignId: createdCampaign.id, isRunning: true });
          
          // Update first stage to active
          setCreationProgress(prev => ({
            ...prev,
            stages: prev.stages.map(stage => 
              stage.name === 'apollo' 
                ? { ...stage, status: 'active' as const, details: 'Starting Apollo scraping...' }
                : stage
            )
          }));
          
          showMessage('success', 'Auto-scraping started! Watch the progress below.');
        } catch (scrapeError: any) {
          setCreationProgress(prev => ({
            ...prev,
            isActive: false,
            stages: prev.stages.map(stage => 
              stage.name === 'apollo' 
                ? { ...stage, status: 'error' as const, details: 'Failed to start scraping' }
                : stage
            )
          }));
          showMessage('error', `Campaign created but auto-scrape failed: ${scrapeError.response?.data?.error || scrapeError.message}`);
        }
      }
      
      setShowCreateForm(false);
      setNewCampaign({ 
        name: '', 
        description: '', 
        tags: '', 
        priority: 0, 
        scraperType: 'apollo' as 'apollo' | 'local',
        apolloUrls: '', 
        localSearch: { query: '', location: '' },
        autoScrape: false 
      });
      loadCampaigns();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const assignAudienceToCampaign = async () => {
    if (!selectedCampaign || !selectedAudienceId) {
      showMessage('error', 'Please select an audience');
      return;
    }

    try {
      setLoading(true);
      // Update campaign with audience_id
      await apiService.updateCampaign(selectedCampaign.id, {
        audience_id: selectedAudienceId
      });
      
      showMessage('success', 'Audience assigned to campaign successfully');
      setShowAudienceSelector(false);
      setSelectedAudienceId('');
      loadCampaigns(); // Refresh to show updated campaign
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to assign audience to campaign');
    } finally {
      setLoading(false);
    }
  };

  const removeAudienceFromCampaign = async () => {
    if (!selectedCampaign) return;

    if (!window.confirm('Are you sure you want to remove the audience from this campaign?')) {
      return;
    }

    try {
      setLoading(true);
      await apiService.updateCampaign(selectedCampaign.id, {
        audience_id: null
      });
      showMessage('success', 'Audience removed from campaign successfully');
      loadCampaigns();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to remove audience from campaign');
    } finally {
      setLoading(false);
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await apiService.deleteCampaign(campaignId);
      showMessage('success', 'Campaign deleted successfully');
      setSelectedCampaign(null);
      loadCampaigns();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to delete campaign');
    } finally {
      setLoading(false);
    }
  };

  const selectCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
  };

  const openPromptEditor = () => {
    setTempIcebreakerPrompt(currentPrompts.icebreaker);
    setShowPromptEditor(true);
  };

  const saveIcebreakerPrompt = async () => {
    try {
      setLoading(true);
      const updatedPrompts = {
        ...currentPrompts,
        icebreaker: tempIcebreakerPrompt
      };
      
      await apiService.updatePrompts(updatedPrompts);
      setCurrentPrompts(updatedPrompts);
      setShowPromptEditor(false);
      showMessage('success', 'Icebreaker prompt updated successfully');
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to update icebreaker prompt');
    } finally {
      setLoading(false);
    }
  };

  const resetToDefault = () => {
    const defaultPrompt = `We just scraped a series of web pages for a business called . Your task is to take their summaries and turn them into catchy, personalized openers for a cold email campaign to imply that the rest of the campaign is personalized.

You'll return your icebreakers in the following JSON format:

{"icebreaker":"Hey {name}. Love {thing}—also doing/like/a fan of {otherThing}. Wanted to run something by you.\\n\\nI hope you'll forgive me, but I creeped you/your site quite a bit, and know that {anotherThing} is important to you guys (or at least I'm assuming this given the focus on {fourthThing}). I put something together a few months ago that I think could help. To make a long story short, it's an outreach system that uses AI to find people and reseache them, and reach out. Costs just a few cents to run, very high converting, and I think it's in line with {someImpliedBeliefTheyHave}"}

Rules:
- Write in a spartan/laconic tone of voice.
- Make sure to use the above format when constructing your icebreakers. We wrote it this way on purpose.
- Shorten the company name wherever possible (say, "XYZ" instead of "XYZ Agency"). More examples: "Love AMS" instead of "Love AMS Professional Services", "Love Mayo" instead of "Love Mayo Inc.", etc.
- Do the same with locations. "San Fran" instead of "San Francisco", "BC" instead of "British Columbia", etc.
- For your variables, focus on small, non-obvious things to paraphrase. The idea is to make people think we *really* dove deep into their website, so don't use something obvious. Do not say cookie-cutter stuff like "Love your website!" or "Love your take on marketing!".`;
    
    setTempIcebreakerPrompt(defaultPrompt);
  };

  const exportCampaignLeads = async (campaignId: string, campaignName: string) => {
    try {
      setLoading(true);
      
      // Create proper filename with .csv extension
      const filename = `${campaignName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}_leads_${new Date().toISOString().split('T')[0]}.csv`;
      
      // THE MOST RELIABLE APPROACH FOR REAL BROWSERS
      // This method works 100% of the time in production Chrome
      const exportUrl = `http://localhost:5001/export-icebreakers?format=csv&campaign_id=${campaignId}&download=1`;
      
      console.log('🔥 TRIGGERING DOWNLOAD:', exportUrl);
      
      // Method 1: Direct window.location.href (most reliable)
      window.location.href = exportUrl;
      
      showMessage('success', `✅ Download started: ${filename}`);
    } catch (error: any) {
      console.error('Export error:', error);
      showMessage('error', `Failed to export ${campaignName} leads: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const checkScriptStatus = useCallback(async () => {
    try {
      const response = await apiService.getScriptStatus();
      const isRunning = response.isRunning;
      const mode = response.mode;
      const campaignId = response.campaignId;
      
      if (isRunning && mode === 'campaign') {
        // Use the campaign ID from the server response
        setScrapingStatus({campaignId: campaignId || null, isRunning: true});
        
        // If scraping is running but progress modal isn't active, reactivate it
        if (campaignId && !creationProgress.isActive) {
          // Fetch logs to restore progress state
          const logs = await apiService.getScriptLogs();
          const campaign = campaigns.find(c => c.id === campaignId);
          if (campaign) {
            setCreationProgress({
              isActive: true,
              isMinimized: true, // Start minimized so it's not intrusive
              campaignName: campaign.name,
              currentStage: 'unknown',
              stages: [
                { name: 'apollo', label: '🔍 Apollo Scraping', status: 'active', progress: 0, details: 'In progress...' },
                { name: 'websites', label: '🌐 Website Research', status: 'pending', progress: 0, details: 'Waiting...' },
                { name: 'icebreakers', label: '💬 AI Icebreakers', status: 'pending', progress: 0, details: 'Waiting...' }
              ],
              overallProgress: 0,
              displayedProgress: 0,
              startTime: Date.now() - (response.uptime * 1000), // Calculate start time from uptime
              estimatedTimeRemaining: 'Calculating...',
              progressHistory: []
            });
          }
        }
      } else {
        setScrapingStatus({campaignId: null, isRunning: false});
        
        // Only clear progress if it was active and scraping is done
        if (creationProgress.isActive && !isRunning) {
          // Keep progress modal open for a bit to show completion
          setTimeout(() => {
            setCreationProgress(prev => ({
              ...prev,
              isActive: false,
              overallProgress: 100,
              displayedProgress: 100,
              estimatedTimeRemaining: 'Completed!'
            }));
          }, 3000);
        }
      }
    } catch (error) {
      // Silently handle - don't show errors for status checks
      setScrapingStatus({campaignId: null, isRunning: false});
    }
  }, [creationProgress.isActive, creationProgress.campaignName, campaigns, scrapingStatus.campaignId]);

  // Check script status periodically when component is mounted
  useEffect(() => {
    checkScriptStatus();
    const interval = setInterval(checkScriptStatus, 3000); // Check every 3 seconds
    return () => clearInterval(interval);
  }, [checkScriptStatus]);
  
  // Poll for detailed progress when creation is active
  const pollCreationProgress = useCallback(async (campaignId: string) => {
    try {
      const status = await apiService.getScriptStatus();
      const logs = await apiService.getScriptLogs();
      
      // Log status for debugging
      console.log('📊 Script status:', status);
      console.log('📝 Recent logs:', logs.logs?.slice(-5));
      
      if (!status.isRunning) {
        // Check if script failed early (less than 10 seconds runtime - more lenient)
        const isEarlyFailure = status.mode === 'campaign' && status.uptime < 10;
        
        if (isEarlyFailure) {
          console.error('⚠️ Script failed early - checking logs for errors');
          
          // Check logs for specific error messages
          const lastLogs = logs.logs?.slice(-10) || [];
          const errorMessages = lastLogs
            .filter(log => log.type === 'stderr' || log.message.toLowerCase().includes('error'))
            .map(log => log.message);
          
          const hasNoUrlsError = errorMessages.some(msg => 
            msg.includes('No pending URLs') || 
            msg.includes('No pending search URLs')
          );
          
          // Script failed early - show error state
          setCreationProgress(prev => ({
            ...prev,
            stages: prev.stages.map((stage, index) => {
              if (index === 0) {
                return {
                  ...stage,
                  status: 'error' as const,
                  progress: 0,
                  details: hasNoUrlsError 
                    ? 'No campaign URLs found - please check database connection'
                    : 'Failed to start scraping - check campaign URLs or API keys'
                };
              }
              return stage;
            })
          }));
          
          showMessage('error', hasNoUrlsError 
            ? 'No campaign URLs found. The campaign may not have saved properly.'
            : 'Campaign scraping failed to start. Please check your API keys and try again.');
          
          // Keep modal open longer for user to see error
          setTimeout(() => {
            setCreationProgress({
              isActive: false,
              isMinimized: false,
              campaignName: '',
              currentStage: '',
              stages: [],
              overallProgress: 0,
              displayedProgress: 0,
              startTime: null,
              estimatedTimeRemaining: 'Calculating...',
              progressHistory: []
            });
          }, 5000);
          
          return;
        }
        
        // Script completed successfully, update final state
        setCreationProgress(prev => ({
          ...prev,
          isActive: false,
          overallProgress: 100,
          stages: prev.stages.map(stage => ({
            ...stage,
            status: stage.status === 'active' ? 'completed' : stage.status,
            progress: 100
          }))
        }));
        
        // Show success notification with export prompt
        showMessage('success', `🎉 Campaign "${newCampaign.name}" completed successfully! You can now export the leads.`);
        
        // Refresh campaigns list to show updated data
        setTimeout(() => {
          loadCampaigns();
          setCreationProgress({
            isActive: false,
            isMinimized: false,
            campaignName: '',
            currentStage: '',
            stages: [],
            overallProgress: 0,
            displayedProgress: 0,
            startTime: null,
            estimatedTimeRemaining: 'Calculating...',
            progressHistory: []
          });
        }, 2000);
        
        return;
      }
      
      // Parse logs to determine current stage and progress
      const recentLogs = logs.logs?.slice(-10) || [];
      const currentStageInfo = parseProgressFromLogs(recentLogs);
      
      // Log progress update for debugging
      console.log('📈 Progress Update:', {
        stage: currentStageInfo.stageName,
        progress: currentStageInfo.progress,
        details: currentStageInfo.details
      });
      
      setCreationProgress(prev => {
        const updatedStages = prev.stages.map((stage, index) => {
          // Find the current stage index
          const currentStageIndex = prev.stages.findIndex(s => s.name === currentStageInfo.stageName);
          
          // Mark all stages before the current one as completed
          if (index < currentStageIndex) {
            return {
              ...stage,
              status: 'completed' as const,
              progress: 100,
              details: stage.details
            };
          }
          
          // Update the current stage
          if (stage.name === currentStageInfo.stageName) {
            return {
              ...stage,
              status: 'active' as const,
              progress: currentStageInfo.progress,
              details: currentStageInfo.details
            };
          }
          
          // Keep future stages as pending
          return stage;
        });
        
        // Calculate overall progress more accurately
        // Each stage represents a portion of the total progress
        const stageWeight = 100 / updatedStages.length;
        let overallProgress = 0;
        
        updatedStages.forEach((stage, index) => {
          if (stage.status === 'completed') {
            // Completed stage contributes full weight
            overallProgress += stageWeight;
          } else if (stage.status === 'active') {
            // Active stage contributes partial weight based on its progress
            overallProgress += (stage.progress / 100) * stageWeight;
          }
          // Pending stages contribute 0
        });
        
        // Cap at 95% until truly complete
        overallProgress = Math.min(95, overallProgress);
        
        // Update progress history for velocity tracking
        const now = Date.now();
        const newHistory = [...(prev.progressHistory || []), { time: now, progress: overallProgress }];
        // Keep only last 20 data points
        const trimmedHistory = newHistory.slice(-20);
        
        const eta = prev.startTime ? calculateETA(
          prev.startTime, 
          overallProgress, 
          trimmedHistory, 
          currentStageInfo.totalContacts, 
          currentStageInfo.currentContact
        ) : 'Calculating...';
        
        console.log('📊 Overall Progress:', overallProgress + '%', 'ETA:', eta, 
                    `Contacts: ${currentStageInfo.currentContact || 0}/${currentStageInfo.totalContacts || '?'}`);
        
        return {
          ...prev,
          stages: updatedStages,
          currentStage: currentStageInfo.stageName,
          overallProgress,
          estimatedTimeRemaining: eta,
          progressHistory: trimmedHistory,
          totalContacts: currentStageInfo.totalContacts,
          currentContact: currentStageInfo.currentContact
        };
      });
      
    } catch (error) {
      console.warn('Progress polling error:', error);
    }
  }, [loadCampaigns]);
  
  // Helper function to parse progress from logs
  const parseProgressFromLogs = (logs: any[]) => {
    const logText = logs.map(log => log.message).join(' ');
    const lowerLogText = logText.toLowerCase();
    
    // Look for explicit stage markers first
    const stageMatch = logText.match(/stage\s+(\d+)/i);
    const currentStageNum = stageMatch ? parseInt(stageMatch[1]) : 0;
    
    // Extract total contacts and current progress for accurate ETA
    let totalContacts = 0;
    let currentContact = 0;
    
    // Look for patterns like "[1.5/64] Processing:" or "Processing contact 5 of 64"
    const progressPattern1 = logText.match(/\[[\d.]+\.(\d+)\/(\d+)\]/g);
    const progressPattern2 = logText.match(/Processing\s+contact\s+(\d+)\s+of\s+(\d+)/gi);
    
    if (progressPattern1) {
      const lastMatch = progressPattern1[progressPattern1.length - 1];
      const numbers = lastMatch.match(/\d+/g);
      if (numbers && numbers.length >= 2) {
        currentContact = parseInt(numbers[0]);
        totalContacts = parseInt(numbers[1]);
      }
    } else if (progressPattern2) {
      const lastMatch = progressPattern2[progressPattern2.length - 1];
      const numbers = lastMatch.match(/\d+/g);
      if (numbers && numbers.length >= 2) {
        currentContact = parseInt(numbers[0]);
        totalContacts = parseInt(numbers[1]);
      }
    }
    
    // Stage 3: Icebreaker generation (check this first as it's the final stage)
    if (currentStageNum === 3 || lowerLogText.includes('stage 3') || lowerLogText.includes('icebreaker')) {
      const processMatches = logText.match(/processing\s+contact\s+(\d+)\s+of\s+(\d+)/gi);
      const generatedMatches = logText.match(/generated?\s+(?:icebreaker|.*icebreaker).*?for\s+contact\s+(\d+)/gi);
      
      if (processMatches) {
        const lastMatch = processMatches[processMatches.length - 1];
        const numbers = lastMatch.match(/\d+/g);
        if (numbers && numbers.length >= 2) {
          const current = parseInt(numbers[0]);
          const total = parseInt(numbers[1]);
          const progress = Math.min(100, (current / total) * 100);
          
          return {
            stageName: 'icebreakers',
            progress,
            details: `Generating icebreaker ${current} of ${total}`,
            totalContacts: total,
            currentContact: current
          };
        }
      }
      
      return {
        stageName: 'icebreakers',
        progress: lowerLogText.includes('generating') ? 30 : 10,
        details: 'Generating personalized icebreakers with AI...',
        totalContacts,
        currentContact
      };
    }
    
    // Stage 2: Website scraping/research
    if (currentStageNum === 2 || lowerLogText.includes('stage 2') || lowerLogText.includes('processing contacts') || lowerLogText.includes('website')) {
      const processMatches = logText.match(/processing\s+contact\s+(\d+)\s+of\s+(\d+)/gi);
      const summaryMatches = logText.match(/summary\s+for\s+contact\s+(\d+)/gi);
      
      if (processMatches) {
        const lastMatch = processMatches[processMatches.length - 1];
        const numbers = lastMatch.match(/\d+/g);
        if (numbers && numbers.length >= 2) {
          const current = parseInt(numbers[0]);
          const total = parseInt(numbers[1]);
          const progress = Math.min(100, (current / total) * 100);
        
          return {
            stageName: 'websites',
            progress,
            details: `Researching website ${current} of ${total}`,
            totalContacts: total,
            currentContact: current
          };
        }
      }
      
      return {
        stageName: 'websites',
        progress: summaryMatches ? 50 : 20,
        details: 'Researching company websites...'
      };
    }
    
    // Stage 1: Apollo/Apify scraping detection
    if (currentStageNum === 1 || lowerLogText.includes('stage 1') || lowerLogText.includes('apollo') || lowerLogText.includes('apify')) {
      // Look for various patterns of contact count reporting
      const storingMatches = logText.match(/Storing\s+(\d+)\s+raw\s+contacts/gi);
      const returnedMatches = logText.match(/returned\s+(\d+)\s+contacts/gi);
      const foundMatches = logText.match(/(?:found|fetched)\s+(\d+)\s+contacts?/gi);
      const scrapingMatches = logText.match(/scraping.*apollo/gi);
      
      // Try to extract the total number of contacts found
      let apolloTotal = 0;
      if (storingMatches) {
        const lastMatch = storingMatches[storingMatches.length - 1];
        const match = lastMatch.match(/\d+/);
        if (match) apolloTotal = parseInt(match[0]);
      } else if (returnedMatches) {
        const lastMatch = returnedMatches[returnedMatches.length - 1];
        const match = lastMatch.match(/\d+/);
        if (match) apolloTotal = parseInt(match[0]);
      } else if (foundMatches) {
        const lastMatch = foundMatches[foundMatches.length - 1];
        const match = lastMatch.match(/\d+/);
        if (match) apolloTotal = parseInt(match[0]);
      }
      
      if (apolloTotal > 0) {
        // Set this as the total for all subsequent stages
        totalContacts = apolloTotal;
        const progress = 100; // Apollo is done if we're storing contacts
        
        return {
          stageName: 'apollo',
          progress,
          details: `Found ${apolloTotal} contacts from Apollo`,
          totalContacts: apolloTotal,
          currentContact: 0
        };
      }
      
      return {
        stageName: 'apollo',
        progress: scrapingMatches ? 50 : 20,
        details: scrapingMatches ? 'Scraping Apollo contacts...' : 'Connecting to Apollo...',
        totalContacts,
        currentContact: 0
      };
    }
    
    // Check for completion indicators
    if (lowerLogText.includes('completed') || lowerLogText.includes('finished') || lowerLogText.includes('success')) {
      return {
        stageName: 'icebreakers',
        progress: 100,
        details: 'Campaign creation completed successfully!',
        totalContacts,
        currentContact: totalContacts // All done
      };
    }
    
    // Default to setup stage with more specific detection
    if (lowerLogText.includes('campaign') || lowerLogText.includes('initializing') || lowerLogText.includes('starting')) {
      return {
        stageName: 'setup',
        progress: 80,
        details: 'Setting up campaign and preparing to scrape...',
        totalContacts,
        currentContact
      };
    }
    
    // Fallback
    return {
      stageName: 'setup',
      progress: 30,
      details: 'Initializing lead generation system...',
      totalContacts,
      currentContact
    };
  };
  
  // Progress polling effect
  useEffect(() => {
    if (!creationProgress.isActive) return;
    
    // Start polling immediately
    pollCreationProgress('current');
    
    const interval = setInterval(() => {
      pollCreationProgress('current');
    }, 2000); // Poll every 2 seconds - balanced between responsiveness and server load
    
    return () => clearInterval(interval);
  }, [creationProgress.isActive, pollCreationProgress]);
  
  // Smooth progress animation effect
  useEffect(() => {
    if (!creationProgress.isActive) return;
    
    const animationInterval = setInterval(() => {
      setCreationProgress(prev => {
        if (prev.displayedProgress < prev.overallProgress) {
          // Increment displayed progress smoothly
          const increment = Math.min(1, prev.overallProgress - prev.displayedProgress);
          return {
            ...prev,
            displayedProgress: prev.displayedProgress + increment
          };
        }
        return prev;
      });
    }, 50); // Update every 50ms for smooth animation
    
    return () => clearInterval(animationInterval);
  }, [creationProgress.isActive, creationProgress.overallProgress]);
  
  // Calculate ETA with improved countdown logic and velocity tracking
  const calculateETA = (startTime: number, currentProgress: number, progressHistory?: Array<{ time: number; progress: number }>, totalContacts?: number, currentContact?: number) => {
    if (!startTime || currentProgress === 0) return 'Calculating...';
    if (currentProgress >= 100) return 'Completing...';
    
    // Calculate how long it's been running
    const elapsed = Date.now() - startTime;
    const elapsedSeconds = elapsed / 1000;
    
    let remainingSeconds: number;
    
    // If we have actual contact counts, use them for accurate ETA
    if (totalContacts && currentContact && totalContacts > 0) {
      const contactsProcessed = currentContact;
      const contactsRemaining = totalContacts - currentContact;
      
      if (contactsProcessed > 0) {
        // Calculate processing rate (contacts per second)
        const processingRate = contactsProcessed / elapsedSeconds;
        
        // Clamp processing rate to realistic bounds
        // Even with parallel processing, website scraping limits us to ~0.3-0.5 contacts/sec
        const clampedRate = Math.min(processingRate, 0.5); // Max 0.5 contacts/second (30/minute)
        
        // Estimate remaining time based on actual processing rate
        remainingSeconds = contactsRemaining / clampedRate;
        
        // Add buffer for different stages (websites take longer than Apollo)
        if (currentProgress < 30) { // Apollo stage
          // Apollo is fast, but websites and AI are slow
          remainingSeconds = (contactsRemaining * 3); // 3 seconds per contact for full pipeline
        } else if (currentProgress < 70) { // Website stage
          remainingSeconds *= 1.3; // Add 30% buffer for AI stage and variability
        } else {
          remainingSeconds *= 1.1; // Small buffer for final processing
        }
      } else {
        // Estimate based on typical processing speed (website scraping is the bottleneck)
        // With 3 parallel workers and ~7 seconds average per website = ~2.3 seconds per contact
        // Add AI processing time (~0.5 seconds per contact with 10 parallel workers)
        remainingSeconds = contactsRemaining * 3; // Realistic estimate: 3 seconds per contact total
      }
    }
    // If we have recent progress history, use it for velocity calculation
    else if (progressHistory && progressHistory.length >= 5) {
      // Get the last 5-10 data points for smoothing
      const recentHistory = progressHistory.slice(-10);
      const oldestPoint = recentHistory[0];
      const newestPoint = recentHistory[recentHistory.length - 1];
      
      const progressDelta = newestPoint.progress - oldestPoint.progress;
      const timeDelta = (newestPoint.time - oldestPoint.time) / 1000; // Convert to seconds
      
      if (timeDelta > 0 && progressDelta > 0.5) { // Only use if we have meaningful progress
        const velocity = progressDelta / timeDelta;
        const remainingProgress = 100 - currentProgress;
        remainingSeconds = remainingProgress / velocity;
      } else {
        // Use dynamic estimate based on typical processing speeds
        // Website scraping is bottleneck: 3 workers * 7 sec/site = ~20 contacts/minute
        const contactsPerMinute = 20; // More realistic with website scraping bottleneck
        const estimatedTotal = totalContacts || 100; // Use actual count or estimate
        const estimatedTotalSeconds = (estimatedTotal / contactsPerMinute) * 60;
        remainingSeconds = ((100 - currentProgress) / 100) * estimatedTotalSeconds;
      }
    } else {
      // For initial estimates, use dynamic calculation based on expected contacts
      // Realistic speed accounting for website scraping bottleneck
      const contactsPerMinute = 20; // ~3 seconds per contact total pipeline
      const estimatedTotal = totalContacts || 100; // Use actual count or estimate
      const estimatedTotalSeconds = (estimatedTotal / contactsPerMinute) * 60;
      remainingSeconds = ((100 - currentProgress) / 100) * estimatedTotalSeconds;
    }
    
    // Ensure remaining time decreases as time passes
    if (remainingSeconds < 0) return 'Almost done...';
    
    // If estimate is unrealistic (> 60 minutes), show generic message
    if (remainingSeconds > 3600) return 'Processing large batch (this may take a while)...';
    
    // Format the time - more concise format
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = Math.floor(remainingSeconds % 60);
    
    if (minutes > 0) {
      return `~${minutes}m ${seconds}s remaining`;
    }
    return `~${seconds}s remaining`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#28a745';
      case 'paused': return '#ffc107';
      case 'completed': return '#007bff';
      case 'archived': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (campaign: Campaign) => {
    // Only show spinning icon for the specific campaign that's scraping
    if (scrapingStatus.isRunning && scrapingStatus.campaignId === campaign.id) {
      return '🔄';
    }
    
    switch (campaign.status) {
      case 'active': return '✅';
      case 'paused': return '⏸️';
      case 'completed': return '🎯';
      case 'archived': return '📦';
      default: return '⏳';
    }
  };


  return (
    <div className="component-container">
      <h2>Campaign Management</h2>
      <p className="component-description">
        Create email campaigns and assign target audiences for lead generation.
      </p>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="campaigns-layout">
        {/* Campaign List */}
        <div className="campaigns-sidebar">
          <div className="sidebar-header">
            <h3>Campaigns</h3>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary btn-small"
              disabled={loading}
            >
              + New Campaign
            </button>
          </div>

          {loading && campaigns.length === 0 ? (
            <div className="loading">Loading campaigns...</div>
          ) : (
            <div className="campaigns-list">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className={`campaign-item ${selectedCampaign?.id === campaign.id ? 'active' : ''}`}
                  onClick={() => selectCampaign(campaign)}
                >
                  <div className="campaign-header">
                    <h4>{campaign.name}</h4>
                    <div className="campaign-status">
                      <div
                        className="status-dot"
                        style={{ backgroundColor: getStatusColor(campaign.status) }}
                      ></div>
                      <span className="status-icon">{getStatusIcon(campaign)}</span>
                      <span>{campaign.status}</span>
                      {scrapingStatus.isRunning && scrapingStatus.campaignId === campaign.id && (
                        <span className="scraping-indicator">Scraping...</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="campaign-stats">
                    <span>URLs: {campaign.total_urls || 0}</span>
                    <span>Leads: {campaign.total_leads_generated || 0}</span>
                    <span>Priority: {campaign.priority || 0}</span>
                  </div>
                  
                  {/* Progress indicator for active scraping */}
                  {scrapingStatus.isRunning && scrapingStatus.campaignId === campaign.id && (
                    <div className="scraping-progress" style={{ 
                      marginTop: '10px', 
                      padding: '10px', 
                      backgroundColor: '#f0f9ff', 
                      borderRadius: '8px',
                      border: '2px solid #3b82f6'
                    }}>
                      <div className="progress-bar">
                        <div className="progress-fill animated" style={{
                          background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #3b82f6 100%)',
                          backgroundSize: '200% 100%',
                          animation: 'shimmer 1.5s ease-in-out infinite'
                        }}></div>
                      </div>
                      <span className="progress-text" style={{ fontWeight: 'bold', color: '#1e40af' }}>
                        🚀 SCRAPING IN PROGRESS...
                      </span>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          // Restore or show the progress modal
                          if (!creationProgress.isActive) {
                            // Need to restore the progress state from logs
                            const logs = await apiService.getScriptLogs();
                            const status = await apiService.getScriptStatus();
                            setCreationProgress({
                              isActive: true,
                              isMinimized: false,
                              campaignName: campaign.name,
                              currentStage: 'unknown',
                              stages: [
                                { name: 'apollo', label: '🔍 Apollo Scraping', status: 'active', progress: 0, details: 'Analyzing progress...' },
                                { name: 'websites', label: '🌐 Website Research', status: 'pending', progress: 0, details: 'Waiting...' },
                                { name: 'icebreakers', label: '💬 AI Icebreakers', status: 'pending', progress: 0, details: 'Waiting...' }
                              ],
                              overallProgress: 0,
                              displayedProgress: 0,
                              startTime: Date.now() - (status.uptime * 1000),
                              estimatedTimeRemaining: 'Calculating...',
                              progressHistory: []
                            });
                          } else {
                            // Just show the existing progress modal
                            setCreationProgress(prev => ({ ...prev, isActive: true, isMinimized: false }));
                          }
                        }}
                        className="btn btn-link btn-small"
                        style={{ marginTop: '0.5rem', color: '#1e40af', fontWeight: 'bold' }}
                      >
                        View Progress →
                      </button>
                    </div>
                  )}
                  
                  {/* Export Button - show prominently for completed campaigns or campaigns with leads */}
                  {(campaign.status === 'completed' || (campaign.total_leads_generated || 0) > 0) && (
                    <div className="campaign-export">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent campaign selection
                          exportCampaignLeads(campaign.id, campaign.name);
                        }}
                        className={`btn ${campaign.status === 'completed' ? 'btn-success' : 'btn-outline'} btn-small export-btn`}
                        disabled={loading}
                        title={`Export ${campaign.total_leads_generated || 0} leads with icebreakers`}
                      >
                        {campaign.status === 'completed' ? '✅' : '📄'} Export CSV ({campaign.total_leads_generated || 0})
                      </button>
                    </div>
                  )}
                  
                  {campaign.description && (
                    <p className="campaign-description">{campaign.description}</p>
                  )}
                  
                  {campaign.tags && campaign.tags.length > 0 && (
                    <div className="campaign-tags">
                      {campaign.tags.map((tag, index) => (
                        <span key={index} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campaign Details */}
        <div className="campaign-details">
          {selectedCampaign ? (
            <>
              <div className="campaign-header">
                <div>
                  <h3>{selectedCampaign.name}</h3>
                  <p>{selectedCampaign.description}</p>
                </div>
                <div className="campaign-actions">
                  {/* Show View Progress button if this campaign is actively scraping */}
                  {scrapingStatus.isRunning && scrapingStatus.campaignId === selectedCampaign.id ? (
                    <button
                      onClick={async () => {
                        // Restore or show the progress modal
                        if (!creationProgress.isActive) {
                          // Need to restore the progress state from logs
                          const logs = await apiService.getScriptLogs();
                          const status = await apiService.getScriptStatus();
                          setCreationProgress({
                            isActive: true,
                            isMinimized: false,
                            campaignName: selectedCampaign.name,
                            currentStage: 'unknown',
                            stages: [
                              { name: 'apollo', label: '🔍 Apollo Scraping', status: 'active', progress: 0, details: 'Analyzing progress...' },
                              { name: 'websites', label: '🌐 Website Research', status: 'pending', progress: 0, details: 'Waiting...' },
                              { name: 'icebreakers', label: '💬 AI Icebreakers', status: 'pending', progress: 0, details: 'Waiting...' }
                            ],
                            overallProgress: 0,
                            displayedProgress: 0,
                            startTime: Date.now() - (status.uptime * 1000),
                            estimatedTimeRemaining: 'Calculating...',
                            progressHistory: []
                          });
                        } else {
                          // Just show the existing progress modal
                          setCreationProgress(prev => ({ ...prev, isActive: true, isMinimized: false }));
                        }
                      }}
                      className="btn btn-warning btn-small"
                      disabled={loading}
                    >
                      🔄 View Scraping Progress
                    </button>
                  ) : (
                    // Show Run Campaign button if not currently scraping
                    (selectedCampaign.total_urls || 0) > 0 && !scrapingStatus.isRunning && (
                      <button
                        onClick={async () => {
                          try {
                            setLoading(true);
                            await apiService.runCampaign(selectedCampaign.id);
                            
                            // Set the scraping status with the campaign ID
                            setScrapingStatus({ campaignId: selectedCampaign.id, isRunning: true });
                            
                            // Initialize progress tracking
                            setCreationProgress({
                              isActive: true,
                              isMinimized: false,
                              campaignName: selectedCampaign.name,
                              currentStage: 'apollo',
                              stages: [
                                { name: 'apollo', label: '🔍 Apollo Scraping', status: 'active', progress: 0, details: 'Starting...' },
                                { name: 'websites', label: '🌐 Website Research', status: 'pending', progress: 0, details: 'Waiting...' },
                                { name: 'icebreakers', label: '💬 AI Icebreakers', status: 'pending', progress: 0, details: 'Waiting...' }
                              ],
                              overallProgress: 0,
                              displayedProgress: 0,
                              startTime: Date.now(),
                              estimatedTimeRemaining: 'Calculating...',
                              progressHistory: []
                            });
                            
                            showMessage('success', '🚀 Campaign scraping started!');
                          } catch (error: any) {
                            showMessage('error', error.response?.data?.error || 'Failed to start campaign');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="btn btn-success btn-small"
                        disabled={loading}
                      >
                        🚀 Run Campaign
                      </button>
                    )
                  )}
                  <button
                    onClick={openPromptEditor}
                    className="btn btn-primary btn-small"
                    disabled={loading}
                  >
                    ✏️ Edit Icebreaker Prompt
                  </button>
                  <button
                    onClick={() => setShowAudienceSelector(true)}
                    className="btn btn-secondary btn-small"
                    disabled={loading}
                  >
                    {selectedCampaign.audience_id ? 'Change Audience' : 'Assign Audience'}
                  </button>
                  {(selectedCampaign.status === 'completed' || (selectedCampaign.total_leads_generated || 0) > 0) && (
                    <button
                      onClick={() => exportCampaignLeads(selectedCampaign.id, selectedCampaign.name)}
                      className={`btn ${selectedCampaign.status === 'completed' ? 'btn-primary' : 'btn-success'} btn-small`}
                      disabled={loading}
                      title={`Export ${selectedCampaign.total_leads_generated || 0} leads with icebreakers`}
                    >
                      {selectedCampaign.status === 'completed' ? '✅ Export Completed Campaign' : '📄 Export Leads'} ({selectedCampaign.total_leads_generated || 0})
                    </button>
                  )}
                  <button
                    onClick={() => deleteCampaign(selectedCampaign.id)}
                    className="btn btn-danger btn-small"
                    disabled={loading}
                  >
                    Delete Campaign
                  </button>
                </div>
              </div>

              {/* Icebreaker Prompt Preview */}
              <div className="campaign-prompt-preview">
                <h4>Current Icebreaker Prompt</h4>
                <div className="prompt-preview">
                  {currentPrompts.icebreaker ? (
                    <pre className="prompt-text">
                      {currentPrompts.icebreaker.length > 200 
                        ? `${currentPrompts.icebreaker.substring(0, 200)}...` 
                        : currentPrompts.icebreaker
                      }
                    </pre>
                  ) : (
                    <p className="no-prompt">No icebreaker prompt configured</p>
                  )}
                  <button
                    onClick={openPromptEditor}
                    className="btn btn-link btn-small"
                    disabled={loading}
                  >
                    {currentPrompts.icebreaker ? 'Edit Prompt' : 'Add Prompt'} →
                  </button>
                </div>
              </div>

              <div className="campaign-audience">
                <h4>Target Audience</h4>
                {selectedCampaign.audience_id ? (
                  (() => {
                    const audience = audiences.find(a => a.id === selectedCampaign.audience_id);
                    return audience ? (
                      <div className="audience-info">
                        <div className="audience-header">
                          <h5>{audience.name}</h5>
                          <div className="audience-actions">
                            <button
                              onClick={() => setShowAudienceSelector(true)}
                              className="btn btn-secondary btn-small"
                              disabled={loading}
                            >
                              Change
                            </button>
                            <button
                              onClick={removeAudienceFromCampaign}
                              className="btn btn-danger btn-small"
                              disabled={loading}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        {audience.description && (
                          <p className="audience-description">{audience.description}</p>
                        )}
                        <div className="audience-stats">
                          <div className="stat">
                            <span className="stat-label">URLs:</span>
                            <span className="stat-value">{audience.total_urls}</span>
                          </div>
                          <div className="stat">
                            <span className="stat-label">Est. Contacts:</span>
                            <span className="stat-value">{audience.estimated_contacts.toLocaleString()}</span>
                          </div>
                          <div className="stat">
                            <span className="stat-label">Status:</span>
                            <span className={`stat-value status-${audience.status}`}>{audience.status}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="audience-error">
                        <p>Audience not found. The assigned audience may have been deleted.</p>
                        <button
                          onClick={() => setShowAudienceSelector(true)}
                          className="btn btn-secondary btn-small"
                        >
                          Assign New Audience
                        </button>
                      </div>
                    );
                  })()
                ) : (
                  <div className="no-audience">
                    <p>No audience assigned to this campaign.</p>
                    <p>Assign an audience from the Leads section to target specific contacts.</p>
                    <button
                      onClick={() => setShowAudienceSelector(true)}
                      className="btn btn-primary btn-small"
                    >
                      Assign Audience
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-selection">
              <h3>Select a campaign</h3>
              <p>Choose a campaign from the list to view and manage its Apollo search URLs.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create New Campaign</h3>
            <div className="form-group">
              <label>Campaign Name *</label>
              <input
                type="text"
                value={newCampaign.name}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                className="form-control"
                placeholder="e.g., Q1 Marketing Directors"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={newCampaign.description}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, description: e.target.value }))}
                className="form-control"
                placeholder="Describe the target audience and goals"
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>Tags (comma-separated)</label>
              <input
                type="text"
                value={newCampaign.tags}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, tags: e.target.value }))}
                className="form-control"
                placeholder="e.g., marketing, tech, q1-2024"
              />
            </div>
            <div className="form-group">
              <label>Priority (0-10)</label>
              <input
                type="number"
                min="0"
                max="10"
                value={newCampaign.priority}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Lead Source Type *</label>
              <div className="scraper-type-selector">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="scraperType"
                    value="apollo"
                    checked={newCampaign.scraperType === 'apollo'}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, scraperType: 'apollo' }))}
                  />
                  <span>🚀 Apollo (B2B Professionals)</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="scraperType"
                    value="local"
                    checked={newCampaign.scraperType === 'local'}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, scraperType: 'local' }))}
                  />
                  <span>🗺️ Local Businesses (Google Maps + LinkedIn)</span>
                </label>
              </div>
            </div>
            
            {newCampaign.scraperType === 'apollo' ? (
              <div className="form-group">
                <label>Apollo URLs *</label>
                <textarea
                  value={newCampaign.apolloUrls}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, apolloUrls: e.target.value }))}
                  className="form-control"
                  placeholder="Paste Apollo URLs (one per line):
https://app.apollo.io/...
https://app.apollo.io/..."
                  rows={6}
                  required
                />
                <small className="form-help">
                  📋 Add Apollo search URLs that will be scraped for leads. Each URL should be on a separate line.
                </small>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label>Business Type/Query *</label>
                  <input
                    type="text"
                    value={newCampaign.localSearch.query}
                    onChange={(e) => setNewCampaign(prev => ({ 
                      ...prev, 
                      localSearch: { ...prev.localSearch, query: e.target.value }
                    }))}
                    className="form-control"
                    placeholder="e.g., hair salons, restaurants, dental clinics"
                    required
                  />
                  <small className="form-help">
                    🔍 Type of local businesses to search for
                  </small>
                </div>
                
                {/* Quick location presets */}
                <div className="form-group">
                  <label>Quick Location Presets</label>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setNewCampaign(prev => ({ 
                        ...prev, 
                        localSearch: { ...prev.localSearch, location: 'USA' }
                      }))}
                      className="btn btn-sm"
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      🇺🇸 All USA
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCampaign(prev => ({ 
                        ...prev, 
                        localSearch: { ...prev.localSearch, location: 'Virginia' }
                      }))}
                      className="btn btn-sm"
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      🏛️ Virginia
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCampaign(prev => ({ 
                        ...prev, 
                        localSearch: { ...prev.localSearch, location: 'California' }
                      }))}
                      className="btn btn-sm"
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      ☀️ California
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCampaign(prev => ({ 
                        ...prev, 
                        localSearch: { ...prev.localSearch, location: 'Texas' }
                      }))}
                      className="btn btn-sm"
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      🤠 Texas
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCampaign(prev => ({ 
                        ...prev, 
                        localSearch: { ...prev.localSearch, location: 'Florida' }
                      }))}
                      className="btn btn-sm"
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      🌴 Florida
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCampaign(prev => ({ 
                        ...prev, 
                        localSearch: { ...prev.localSearch, location: 'New York' }
                      }))}
                      className="btn btn-sm"
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      🗽 New York
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Location *</label>
                  <input
                    type="text"
                    value={newCampaign.localSearch.location}
                    onChange={(e) => setNewCampaign(prev => ({ 
                      ...prev, 
                      localSearch: { ...prev.localSearch, location: e.target.value }
                    }))}
                    className="form-control"
                    placeholder="e.g., Austin, TX | Virginia | USA | 37.0871,-76.4730"
                    required
                  />
                  <small className="form-help">
                    📍 Options: City (Austin, TX), State (Virginia), Country (USA), or Coordinates (lat,long)
                  </small>
                </div>
              </>
            )}
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={newCampaign.autoScrape}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, autoScrape: e.target.checked }))}
                  className="form-checkbox"
                />
                <span className="checkbox-text">
                  🚀 Start scraping immediately after creating campaign
                </span>
              </label>
              <small className="form-help">
                When enabled, the campaign will automatically begin scraping leads and generating icebreakers after creation.
              </small>
            </div>
            <div className="modal-actions">
              <button
                onClick={createCampaign}
                className="btn btn-primary"
                disabled={loading}
              >
                Create Campaign
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audience Selection Modal */}
      {showAudienceSelector && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Assign Audience to Campaign</h3>
            <p className="modal-description">
              Select a target audience or create a new one for this campaign.
            </p>
            
            {!showCreateAudience && audiences.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <button 
                  onClick={() => setShowCreateAudience(true)}
                  className="btn btn-secondary"
                >
                  + Create New Audience
                </button>
              </div>
            )}
            
            {showCreateAudience ? (
              <div className="create-audience-form">
                <h4>Create New Audience</h4>
                <div className="form-group">
                  <label>Audience Name *</label>
                  <input
                    type="text"
                    value={newAudience.name}
                    onChange={(e) => setNewAudience({ ...newAudience, name: e.target.value })}
                    placeholder="e.g., Marketing Directors"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={newAudience.description}
                    onChange={(e) => setNewAudience({ ...newAudience, description: e.target.value })}
                    placeholder="Describe your target audience"
                    rows={3}
                  />
                </div>
                <div className="form-actions">
                  <button
                    onClick={async () => {
                      if (!newAudience.name.trim()) {
                        showMessage('error', 'Audience name is required');
                        return;
                      }
                      try {
                        const response = await apiService.createAudience(newAudience);
                        showMessage('success', 'Audience created successfully');
                        await loadAudiences();
                        setSelectedAudienceId(response.audience.id);
                        setShowCreateAudience(false);
                        setNewAudience({ name: '', description: '' });
                      } catch (error) {
                        showMessage('error', 'Failed to create audience');
                      }
                    }}
                    className="btn btn-primary"
                    disabled={!newAudience.name.trim()}
                  >
                    Create Audience
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateAudience(false);
                      setNewAudience({ name: '', description: '' });
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label>Available Audiences</label>
                <div className="audience-selector">
                {audiences.length === 0 ? (
                  <div className="no-audiences">
                    <p>No audiences available.</p>
                    <button 
                      onClick={() => setShowCreateAudience(true)}
                      className="btn btn-primary btn-small"
                    >
                      + Create Audience
                    </button>
                  </div>
                ) : (
                  <div className="audience-options">
                    {audiences.map(audience => (
                      <div
                        key={audience.id}
                        className={`audience-option ${
                          selectedAudienceId === audience.id ? 'selected' : ''
                        }`}
                        onClick={() => setSelectedAudienceId(audience.id)}
                      >
                        <div className="audience-option-header">
                          <h5>{audience.name}</h5>
                          <span className={`status-badge ${audience.status}`}>
                            {audience.status}
                          </span>
                        </div>
                        {audience.description && (
                          <p className="audience-option-description">{audience.description}</p>
                        )}
                        <div className="audience-option-stats">
                          <span>{audience.total_urls} URLs</span>
                          <span>{audience.estimated_contacts.toLocaleString()} contacts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              </div>
            )}
            
            <div className="modal-actions">
              <button
                onClick={assignAudienceToCampaign}
                className="btn btn-primary"
                disabled={loading || !selectedAudienceId || audiences.length === 0}
              >
                {loading ? 'Assigning...' : 'Assign Audience'}
              </button>
              <button
                onClick={() => {
                  setShowAudienceSelector(false);
                  setSelectedAudienceId('');
                }}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Creation Progress Modal */}
      {creationProgress.isActive && (
        <div className={`modal-overlay progress-modal-overlay ${creationProgress.isMinimized ? 'minimized' : ''}`}>
          <div className={`modal large progress-modal ${creationProgress.isMinimized ? 'minimized' : ''}`}>
            <div className="progress-modal-header">
              <div className="progress-modal-title">
                <h3>🚀 Creating Campaign: {creationProgress.campaignName}</h3>
                <div className="progress-modal-controls">
                  <button
                    onClick={() => setCreationProgress(prev => ({ ...prev, isMinimized: !prev.isMinimized }))}
                    className="btn btn-icon minimize-btn"
                    title={creationProgress.isMinimized ? "Expand" : "Minimize"}
                  >
                    {creationProgress.isMinimized ? '⬆️' : '⬇️'}
                  </button>
                </div>
              </div>
              {!creationProgress.isMinimized && (
                <div className="progress-subtitle">
                  <p>Scraping leads and generating icebreakers</p>
                  <p className="progress-metrics">
                    <strong>{creationProgress.currentContact || 0} / {creationProgress.totalContacts || '?'}</strong> contacts processed • 
                    <strong> {creationProgress.estimatedTimeRemaining}</strong>
                  </p>
                </div>
              )}
            </div>
            
            {/* Minimized View - Just show overall progress */}
            {creationProgress.isMinimized ? (
              <div className="minimized-progress">
                <div className="minimized-progress-bar">
                  <div 
                    className="overall-progress-fill smooth-transition"
                    style={{ width: `${creationProgress.displayedProgress}%` }}
                  ></div>
                </div>
                <span className="minimized-progress-text">
                  {creationProgress.currentContact && creationProgress.totalContacts ? (
                    <>{creationProgress.currentContact}/{creationProgress.totalContacts} contacts • </>
                  ) : null}
                  {Math.round(creationProgress.displayedProgress)}% • {creationProgress.estimatedTimeRemaining}
                </span>
              </div>
            ) : (
              <>
                {/* Overall Progress */}
                <div className="overall-progress-section">
                  <div className="overall-progress-header">
                    <span className="overall-progress-label">
                      Overall Progress
                      {creationProgress.currentContact && creationProgress.totalContacts && (
                        <span style={{ marginLeft: '10px', fontSize: '0.9em', opacity: 0.9 }}>
                          ({creationProgress.currentContact}/{creationProgress.totalContacts} contacts)
                        </span>
                      )}
                    </span>
                    <span className="overall-progress-percent">{Math.round(creationProgress.displayedProgress)}%</span>
                    <span className="overall-progress-eta">{creationProgress.estimatedTimeRemaining}</span>
                  </div>
                  <div className="overall-progress-bar">
                    <div 
                      className="overall-progress-fill smooth-transition"
                      style={{ 
                        width: `${creationProgress.displayedProgress}%`,
                        transition: 'width 0.3s ease-out'
                      }}
                    ></div>
                  </div>
                </div>
            
            {/* Detailed Stage Progress */}
            <div className="stages-progress-section">
              <h4>Progress Details</h4>
              {creationProgress.stages.map((stage, index) => (
                <div key={stage.name} className={`stage-item ${stage.status}`}>
                  <div className="stage-header">
                    <div className="stage-info">
                      <span className="stage-icon">
                        {stage.status === 'completed' ? '✅' : 
                         stage.status === 'active' ? '🔄' : 
                         stage.status === 'error' ? '❌' : '⏳'}
                      </span>
                      <span className="stage-label">{stage.label}</span>
                      {stage.status === 'active' && (
                        <span className="stage-percent">{Math.round(stage.progress)}%</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Stage Progress Bar */}
                  <div className="stage-progress-bar">
                    <div 
                      className={`stage-progress-fill ${stage.status === 'active' ? 'animated' : ''}`}
                      style={{ width: `${stage.progress}%` }}
                    ></div>
                  </div>
                  
                  {/* Stage Details */}
                  {stage.details && (
                    <p className="stage-details">{stage.details}</p>
                  )}
                </div>
              ))}
            </div>
            
            {/* Action Buttons - Only show when expanded */}
            <div className="progress-modal-actions">
              <div className="progress-status">
                {creationProgress.currentStage && (
                  <span className="current-stage-indicator">
                    Currently: {creationProgress.stages.find(s => s.name === creationProgress.currentStage)?.label || creationProgress.currentStage}
                  </span>
                )}
              </div>
              
              <div className="progress-actions">
                <span className="progress-note">
                  🔄 Processing in background - you can minimize this window
                </span>
              </div>
            </div>
            </>
            )}
          </div>
        </div>
      )}

      {/* Icebreaker Prompt Editor Modal */}
      {showPromptEditor && (
        <div className="modal-overlay">
          <div className="modal large">
            <h3>Edit Icebreaker Prompt for {selectedCampaign?.name}</h3>
            <p className="modal-description">
              Customize the AI prompt used to generate personalized icebreakers for this campaign's leads.
              This prompt will be used when processing contacts from this campaign's Apollo URLs.
            </p>
            
            <div className="form-group">
              <label>Icebreaker Prompt</label>
              <textarea
                value={tempIcebreakerPrompt}
                onChange={(e) => setTempIcebreakerPrompt(e.target.value)}
                className="form-control prompt-editor"
                placeholder="Enter your custom icebreaker prompt..."
                rows={15}
              />
              <small className="form-help">
                Use variables like {'{name}'}, {'{thing}'}, {'{otherThing}'} for personalization.
                The AI will replace these with relevant information from each contact's research.
              </small>
            </div>

            <div className="prompt-editor-actions">
              <div className="editor-tools">
                <button
                  onClick={resetToDefault}
                  className="btn btn-secondary btn-small"
                  type="button"
                >
                  Reset to Default
                </button>
                <span className="char-count">
                  {tempIcebreakerPrompt.length} characters
                </span>
              </div>
              
              <div className="modal-actions">
                <button
                  onClick={saveIcebreakerPrompt}
                  className="btn btn-primary"
                  disabled={loading || !tempIcebreakerPrompt.trim()}
                >
                  {loading ? 'Saving...' : 'Save Prompt'}
                </button>
                <button
                  onClick={() => setShowPromptEditor(false)}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns;