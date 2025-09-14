const express = require('express');
const cors = require('cors');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { ApifyClient } = require('apify-client');
const { gmapsCampaigns, gmapsCoverage, gmapsBusinesses, gmapsExport, initializeSchema } = require('./supabase-db');

// Script execution state
let currentExecution = {
  isRunning: false,
  process: null,
  startTime: null,
  mode: null,
  logs: [],
  status: 'idle'
};

let executionHistory = [];

// Detect the correct Python executable with Supabase installed
let pythonCmd = 'python';
try {
  // First try python (which has Supabase)
  pythonCmd = execSync('which python', { encoding: 'utf8' }).trim();
  console.log('Using Python with Supabase:', pythonCmd);
} catch (e) {
  // Fallback to python3 if python doesn't exist
  try {
    pythonCmd = execSync('which python3', { encoding: 'utf8' }).trim();
    console.log('Fallback to python3:', pythonCmd);
  } catch (e2) {
    console.log('Could not detect python path, using default');
    pythonCmd = 'python';
  }
}

const app = express();
const port = 5001;

app.use(cors());
app.use(express.json());

// Increase timeout for long-running Apollo scrapes
app.use((req, res, next) => {
  // Set timeout to 45 minutes for script execution endpoints
  if (req.path.includes('/run-script') || req.path.includes('/script-')) {
    req.setTimeout(2700000); // 45 minutes in milliseconds
    res.setTimeout(2700000); // 45 minutes in milliseconds
  }
  next();
});

// Simple storage with persistence
const STATE_FILE = path.join(__dirname, '.app-state.json');

// Load state from file if it exists
let appState = {
  // Multi-tenant state
  currentOrganization: '9b86d8e2-3031-40e3-a3d7-2bde19e1a2dd', // Selected organization
  organizations: {}, // Cache of organization data
  apiKeys: {}, // Global admin API keys (fallback)
  settings: {
    ai_model_summary: "gpt-4o-mini",
    ai_model_icebreaker: "gpt-4o", 
    ai_temperature: 0.5,
    delay_between_ai_calls: 45
  },
  prompts: {
    summary: `You're provided a Markdown scrape of a website page. Your task is to provide a two-paragraph abstract of what this page is about.

Return in this JSON format:

{"abstract":"your abstract goes here"}

Rules:
- Your extract should be comprehensive—similar level of detail as an abstract to a published paper.
- Use a straightforward, spartan tone of voice.
- If it's empty, just say "no content".`,
    icebreaker: `We just scraped a series of web pages for a business called . Your task is to take their summaries and turn them into catchy, personalized openers for a cold email campaign to imply that the rest of the campaign is personalized.

You'll return your icebreakers in the following JSON format:

{"icebreaker":"Hey {name}. Love {thing}—also doing/like/a fan of {otherThing}. Wanted to run something by you.\\n\\nI hope you'll forgive me, but I creeped you/your site quite a bit, and know that {anotherThing} is important to you guys (or at least I'm assuming this given the focus on {fourthThing}). I put something together a few months ago that I think could help. To make a long story short, it's an outreach system that uses AI to find people and reseache them, and reach out. Costs just a few cents to run, very high converting, and I think it's in line with {someImpliedBeliefTheyHave}"}

Rules:
- Write in a spartan/laconic tone of voice.
- Make sure to use the above format when constructing your icebreakers. We wrote it this way on purpose.
- Shorten the company name wherever possible (say, "XYZ" instead of "XYZ Agency"). More examples: "Love AMS" instead of "Love AMS Professional Services", "Love Mayo" instead of "Love Mayo Inc.", etc.
- Do the same with locations. "San Fran" instead of "San Francisco", "BC" instead of "British Columbia", etc.
- For your variables, focus on small, non-obvious things to paraphrase. The idea is to make people think we *really* dove deep into their website, so don't use something obvious. Do not say cookie-cutter stuff like "Love your website!" or "Love your take on marketing!".`
  }
};

// Load existing state if available
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      appState = { ...appState, ...saved };
      console.log('Loaded saved state with API keys:', Object.keys(appState.apiKeys));
      
      // Initialize supabase settings if not present
      if (!appState.supabase) {
        appState.supabase = {
          url: '',
          key: ''
        };
      }
    }
  } catch (err) {
    console.log('Could not load saved state:', err.message);
  }
}

// Save state to file (with real API keys, not masked ones)
function saveState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(appState, null, 2));
  } catch (err) {
    console.log('Could not save state:', err.message);
  }
}

// Load state on startup
loadState();

// API Routes
app.get('/', (req, res) => {
  res.json({ message: 'Lead Generation API (Simple Express Server)' });
});

app.get('/api-keys', (req, res) => {
  // Return masked API keys for security
  const maskedKeys = {};
  for (const [key, value] of Object.entries(appState.apiKeys)) {
    if (value && typeof value === 'string') {
      // Only mask if it's not already masked
      if (value.includes('*')) {
        maskedKeys[key] = value; // Already masked
      } else {
        maskedKeys[key] = value.length > 8 ? '*'.repeat(value.length - 8) + value.slice(-8) : '*'.repeat(value.length);
      }
    } else {
      maskedKeys[key] = null;
    }
  }
  res.json(maskedKeys);
});

app.post('/api-keys', (req, res) => {
  const { openai_api_key, apify_api_key } = req.body;
  
  // Only save if it's a real API key (not masked)
  if (openai_api_key && !openai_api_key.includes('*')) {
    appState.apiKeys.openai_api_key = openai_api_key;
    console.log('OpenAI API key updated with real key');
  } else if (openai_api_key && openai_api_key.includes('*')) {
    console.log('Ignoring masked OpenAI API key - keeping existing real key');
  }
  
  if (apify_api_key && !apify_api_key.includes('*')) {
    appState.apiKeys.apify_api_key = apify_api_key;
    console.log('Apify API key updated with real key');
  } else if (apify_api_key && apify_api_key.includes('*')) {
    console.log('Ignoring masked Apify API key - keeping existing real key');
  }
  
  saveState(); // Persist the changes
  console.log('API keys updated and saved');
  res.json({ message: 'API keys updated successfully' });
});

app.get('/settings', (req, res) => {
  res.json(appState.settings);
});

app.post('/settings', (req, res) => {
  appState.settings = { ...appState.settings, ...req.body };
  saveState(); // Persist the changes
  res.json({ message: 'Settings updated successfully' });
});

app.get('/prompts', (req, res) => {
  res.json(appState.prompts);
});

app.post('/prompts', (req, res) => {
  appState.prompts = { ...appState.prompts, ...req.body };
  saveState(); // Persist the changes
  res.json({ message: 'Prompts updated successfully' });
});

// Supabase settings endpoints
app.get('/supabase', (req, res) => {
  // Return masked Supabase key for security
  const maskedSupabase = {
    url: appState.supabase?.url || '',
    key: appState.supabase?.key ? 
      (appState.supabase.key.includes('*') ? 
        appState.supabase.key : 
        '*'.repeat(Math.max(0, appState.supabase.key.length - 8)) + appState.supabase.key.slice(-8)
      ) : ''
  };
  res.json(maskedSupabase);
});

app.post('/supabase', (req, res) => {
  const { url, key } = req.body;
  
  if (!appState.supabase) {
    appState.supabase = {};
  }
  
  // Only save if it's a real key (not masked)
  if (url) {
    appState.supabase.url = url;
    console.log('Supabase URL updated');
  }
  
  if (key && !key.includes('*')) {
    appState.supabase.key = key;
    console.log('Supabase key updated with real key');
  } else if (key && key.includes('*')) {
    console.log('Ignoring masked Supabase key - keeping existing real key');
  }
  
  saveState(); // Persist the changes
  res.json({ message: 'Supabase settings updated successfully' });
});

app.post('/test-supabase', async (req, res) => {
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ status: 'error', message: 'Supabase URL and key must be configured' });
  }
  
  try {
    // Test Supabase connection with a simple REST API call
    // This should work even without tables existing
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const testUrl = `${cleanUrl}/rest/v1/?select=version()`;
    
    console.log('Testing Supabase connection...');
    console.log('URL:', testUrl);
    console.log('Key length:', supabaseKey.length);
    
    const testResponse = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', testResponse.status);
    
    if (testResponse.ok) {
      res.json({ 
        status: 'success', 
        message: 'Supabase connection successful! Your credentials are valid.' 
      });
    } else {
      const errorText = await testResponse.text();
      console.log('Error response:', errorText);
      
      // Provide more helpful error messages
      let errorMessage = `Connection failed (${testResponse.status})`;
      
      if (testResponse.status === 401) {
        errorMessage = 'Invalid API key. Please check your Supabase API key.';
      } else if (testResponse.status === 404) {
        errorMessage = 'Invalid project URL. Please check your Supabase project URL format (should be https://your-project.supabase.co)';
      } else if (testResponse.status === 403) {
        errorMessage = 'Access denied. Make sure you\'re using the correct API key with sufficient permissions.';
      }
      
      res.status(500).json({ 
        status: 'error', 
        message: errorMessage
      });
    }
  } catch (error) {
    console.log('Connection test exception:', error);
    res.status(500).json({ 
      status: 'error', 
      message: `Connection error: ${error.message}. Please check your URL format.` 
    });
  }
});

app.post('/test-connection', async (req, res) => {
  const openaiKey = appState.apiKeys.openai_api_key;
  console.log('Testing connection with key:', openaiKey ? `${openaiKey.substring(0, 10)}...` : 'NOT SET');
  
  if (!openaiKey) {
    return res.status(400).json({ status: 'error', message: 'OpenAI API key not configured' });
  }

  try {
    // Call Python script to test connection
    const scriptPath = path.join(__dirname, 'test_openai.py');
    console.log('Calling Python script:', scriptPath);
    
    const python = spawn(pythonCmd, [scriptPath, openaiKey]);

    let result = '';
    let error = '';

    python.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Python stdout:', output);
      result += output;
    });

    python.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      console.log('Python stderr:', errorOutput);
      error += errorOutput;
    });

    python.on('close', (code) => {
      console.log('Python script exit code:', code);
      console.log('Final result:', result.trim());
      console.log('Final error:', error.trim());
      
      if (code === 0 && result.trim().includes('SUCCESS')) {
        res.json({ status: 'success', message: 'OpenAI API connection successful' });
      } else {
        let errorMessage = error.trim() || result.trim() || 'Connection test failed';
        
        // Clean up common error messages for better user experience
        if (errorMessage.includes('Incorrect API key provided')) {
          errorMessage = 'Invalid OpenAI API key. Please check your key and try again.';
        } else if (errorMessage.includes('Error code: 401')) {
          errorMessage = 'Authentication failed. Please verify your OpenAI API key is correct.';
        } else if (errorMessage.includes('insufficient_quota')) {
          errorMessage = 'Your OpenAI API key has insufficient credits. Please add credits to your account.';
        }
        
        res.status(500).json({ status: 'error', message: errorMessage });
      }
    });

  } catch (err) {
    console.log('Connection test exception:', err);
    res.status(500).json({ status: 'error', message: 'Connection test error: ' + err.message });
  }
});

app.post('/generate-icebreaker', async (req, res) => {
  const { contact, custom_prompts } = req.body;
  const openaiKey = appState.apiKeys.openai_api_key;
  
  if (!openaiKey) {
    return res.status(400).json({ error: 'OpenAI API key not configured' });
  }

  try {
    // Call Python script to generate icebreaker
    const python = spawn(pythonCmd, [
      path.join(__dirname, 'generate_icebreaker.py'),
      openaiKey,
      JSON.stringify(contact),
      JSON.stringify(custom_prompts || appState.prompts),
      JSON.stringify(appState.settings)
    ]);

    let result = '';
    let error = '';

    python.stdout.on('data', (data) => {
      result += data.toString();
    });

    python.stderr.on('data', (data) => {
      error += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        try {
          const response = JSON.parse(result);
          res.json(response);
        } catch (e) {
          res.status(500).json({ error: 'Failed to parse response: ' + result });
        }
      } else {
        res.status(500).json({ error: error || 'Icebreaker generation failed' });
      }
    });

  } catch (err) {
    res.status(500).json({ error: 'Generation error: ' + err.message });
  }
});

app.get('/sample-data', (req, res) => {
  res.json({
    contacts: [
      {
        first_name: "Sarah",
        last_name: "Johnson",
        headline: "Marketing Director at TechCorp", 
        location: "San Francisco, CA",
        website_summaries: [
          "TechCorp is a B2B SaaS company that provides customer relationship management solutions for small to medium businesses. They focus on automation and integration with popular business tools.",
          "Their product suite includes lead tracking, email automation, and analytics dashboards. The company emphasizes user-friendly design and affordable pricing for growing businesses."
        ]
      },
      {
        first_name: "Mike",
        last_name: "Chen",
        headline: "CEO & Founder at GreenTech Solutions",
        location: "Austin, TX", 
        website_summaries: [
          "GreenTech Solutions specializes in sustainable technology consulting for enterprise clients. They help companies reduce carbon footprint through smart energy management systems.",
          "The company offers comprehensive sustainability audits, renewable energy integration planning, and ongoing optimization services. They've worked with Fortune 500 companies across various industries."
        ]
      },
      {
        first_name: "Lisa",
        last_name: "Rodriguez",
        headline: "VP of Operations at DataFlow Inc",
        location: "New York, NY",
        website_summaries: [
          "DataFlow Inc provides cloud-based data processing and analytics solutions for financial services companies. They specialize in real-time data streaming and compliance reporting.", 
          "Their platform handles millions of transactions daily with enterprise-grade security and regulatory compliance. The company focuses on reducing processing time and improving data accuracy for their clients."
        ]
      }
    ]
  });
});

// Export icebreakers endpoint
app.get('/export-icebreakers', async (req, res) => {
  const { campaign_id, campaign, filename, download } = req.query;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    
    let audienceFilter = '';
    let campaignName = 'All Campaigns';
    let actualCampaignId = campaign_id;
    
    // Support both campaign_id and campaign name
    if (campaign && !campaign_id) {
      // If campaign name is provided, get its ID
      const campaignResponse = await fetch(`${cleanUrl}/rest/v1/campaigns?name=eq.${encodeURIComponent(campaign)}&select=id,name`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!campaignResponse.ok) {
        throw new Error(`Failed to fetch campaign: ${campaignResponse.statusText}`);
      }
      
      const campaigns = await campaignResponse.json();
      if (!campaigns || campaigns.length === 0) {
        return res.json({ error: `Campaign "${campaign}" not found`, count: 0, data: [] });
      }
      
      actualCampaignId = campaigns[0].id;
      campaignName = campaigns[0].name;
    } else if (actualCampaignId) {
      const campaignResponse = await fetch(`${cleanUrl}/rest/v1/campaigns?id=eq.${campaign_id}&select=name`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!campaignResponse.ok) {
        throw new Error(`Failed to fetch campaign: ${campaignResponse.statusText}`);
      }
      
      const campaigns = await campaignResponse.json();
      if (!campaigns || campaigns.length === 0) {
        return res.json({ error: 'Campaign not found', count: 0, data: [] });
      }
      
      const campaign = campaigns[0];
      campaignName = campaign.name;
    }
    
    let query;
    if (actualCampaignId) {
      // First get the search_url IDs for this campaign
      const searchUrlsResponse = await fetch(`${cleanUrl}/rest/v1/search_urls?campaign_id=eq.${actualCampaignId}&select=id`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!searchUrlsResponse.ok) {
        throw new Error(`Failed to fetch search URLs: ${searchUrlsResponse.statusText}`);
      }
      
      const searchUrls = await searchUrlsResponse.json();
      const searchUrlIds = searchUrls.map(su => su.id);
      
      if (searchUrlIds.length === 0) {
        return res.json({ error: 'No URLs found for this campaign', count: 0, data: [] });
      }
      
      // Get processed leads with icebreakers for these search URLs, joined with raw_contacts for company info
      const searchUrlFilter = searchUrlIds.map(id => `"${id}"`).join(',');
      query = `${cleanUrl}/rest/v1/processed_leads?select=first_name,last_name,email,linkedin_url,headline,icebreaker,subject_line,created_at,raw_contact_id,raw_contacts!inner(raw_data_json)&search_url_id=in.(${searchUrlFilter})&icebreaker=not.is.null&order=first_name.asc`;
    } else {
      // For all campaigns fallback (legacy audience-based)
      query = `${cleanUrl}/rest/v1/raw_contacts?select=name,email,linkedin_url,title,headline,mutiline_icebreaker,scraped_at,audience_id&mutiline_icebreaker=not.is.null${audienceFilter}&order=name.asc`;
    }
    
    const response = await fetch(query, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch contacts: ${response.statusText}`);
    }

    const contacts = await response.json();
    
    if (!contacts || contacts.length === 0) {
      return res.json({ error: 'No icebreakers found', count: 0, data: [] });
    }

    // Format for CSV export - from processed_leads
    const csvData = contacts.map(contact => {
      // Extract company name from raw_data_json if available
      let companyName = '';
      if (contact.raw_contacts && contact.raw_contacts.raw_data_json) {
        try {
          const rawData = typeof contact.raw_contacts.raw_data_json === 'string' 
            ? JSON.parse(contact.raw_contacts.raw_data_json) 
            : contact.raw_contacts.raw_data_json;
          
          // Handle Apollo data structure (organization is an object with name field)
          if (rawData.organization) {
            if (typeof rawData.organization === 'object' && rawData.organization.name) {
              companyName = rawData.organization.name;
            } else if (typeof rawData.organization === 'string') {
              companyName = rawData.organization;
            }
          }
          
          // Fall back to other possible fields
          if (!companyName) {
            companyName = rawData.company || rawData.company_name || 
                         rawData.current_company || rawData.businessName || rawData.name || '';
          }
        } catch (e) {
          console.error('Error parsing raw_data_json:', e);
        }
      }
      
      return {
        name: contact.first_name && contact.last_name ? `${contact.first_name} ${contact.last_name}` : contact.name || '',
        company: companyName,
        email: contact.email || '',
        subject_line: contact.subject_line || '',
        icebreaker: contact.icebreaker || contact.mutiline_icebreaker || '',
        linkedin_url: contact.linkedin_url || '',
        title: contact.title || '',
        headline: contact.headline || '',
        scraped_at: contact.created_at || contact.processed_at || contact.scraped_at || ''
      };
    });

    // Check if client wants CSV download directly
    if (req.query.format === 'csv') {
      const csvHeaders = ['name', 'company', 'email', 'subject_line', 'icebreaker', 'linkedin_url', 'title', 'headline', 'scraped_at'];
      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => 
          csvHeaders.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(',')
        )
      ].join('\r\n'); // Use Windows line endings for better compatibility
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const exportFilename = filename || (campaignName === 'All Campaigns' 
        ? `icebreakers_export_${timestamp}.csv`
        : `icebreakers_export_${campaignName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.csv`);
      
      // Add UTF-8 BOM for better Excel compatibility
      const bom = '\uFEFF';
      const csvWithBom = bom + csvContent;
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${exportFilename}"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Content-Transfer-Encoding', 'binary');
      
      // Additional headers to force download behavior
      if (download) {
        console.log('Download parameter detected, setting enhanced headers for:', exportFilename);
        res.setHeader('X-Suggested-Filename', exportFilename);
        res.setHeader('Content-Disposition', `attachment; filename="${exportFilename}"; filename*=UTF-8''${encodeURIComponent(exportFilename)}`);
        res.setHeader('X-Download-Options', 'noopen');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }
      
      res.setHeader('Content-Length', Buffer.byteLength(csvWithBom, 'utf8'));
      res.send(csvWithBom);
      return;
    }
    
    res.json({
      success: true,
      count: contacts.length,
      data: csvData,
      campaign: campaignName,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to export icebreakers: ' + err.message });
  }
});

// Multi-tenant Organization Management endpoints
app.get('/organizations', async (req, res) => {
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/v_organization_dashboard?select=*&order=created_at.desc`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const organizations = await response.json();
    res.json({ organizations });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/organizations', async (req, res) => {
  const { name, slug, description, contact_email, subscription_plan = 'free' } = req.body;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  if (!name || !slug) {
    return res.status(400).json({ error: 'Organization name and slug are required' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/organizations`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        name,
        slug,
        description,
        contact_email,
        subscription_plan,
        status: 'trial'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const organization = await response.json();
    res.json({ organization: organization[0] });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/organizations/:id', async (req, res) => {
  const { id } = req.params;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/v_organization_dashboard?id=eq.${id}`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const organizations = await response.json();
    if (organizations.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({ organization: organizations[0] });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/organizations/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/organizations?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const organization = await response.json();
    res.json({ organization: organization[0] });
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/organizations/:id', async (req, res) => {
  const { id } = req.params;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/organizations?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    res.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ error: error.message });
  }
});

// Organization Context Management
app.post('/set-organization', (req, res) => {
  const { organizationId } = req.body;
  
  if (!organizationId) {
    return res.status(400).json({ error: 'Organization ID is required' });
  }

  appState.currentOrganization = organizationId;
  saveState();
  
  res.json({ 
    message: 'Organization context set successfully',
    organizationId 
  });
});

app.get('/current-organization', async (req, res) => {
  const currentOrgId = appState.currentOrganization;
  
  if (!currentOrgId) {
    return res.json({ 
      organizationId: null,
      organization: null
    });
  }

  // Try to get cached organization first
  let organization = appState.organizations[currentOrgId];
  
  // If not cached, fetch from Supabase
  if (!organization) {
    const supabaseUrl = appState.supabase?.url;
    const supabaseKey = appState.supabase?.key;
    
    if (supabaseUrl && supabaseKey) {
      try {
        const cleanUrl = supabaseUrl.replace(/\/+$/, '');
        const response = await fetch(`${cleanUrl}/rest/v1/v_organization_dashboard?id=eq.${currentOrgId}`, {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const organizations = await response.json();
          if (organizations.length > 0) {
            organization = organizations[0];
            // Cache the organization for future requests
            appState.organizations[currentOrgId] = organization;
          }
        }
      } catch (error) {
        console.error('Error fetching current organization:', error);
      }
    }
  }

  res.json({ 
    organizationId: currentOrgId,
    organization: organization || null
  });
});

// Organization-specific API Keys and Settings
app.get('/organizations/:id/api-keys', async (req, res) => {
  const { id } = req.params;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/organizations?id=eq.${id}&select=openai_api_key_encrypted,apify_api_key_encrypted`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const organizations = await response.json();
    if (organizations.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const org = organizations[0];
    
    // Return masked API keys for security
    const maskedKeys = {
      openai_api_key: org.openai_api_key_encrypted ? 
        '*'.repeat(Math.max(0, org.openai_api_key_encrypted.length - 8)) + 
        (org.openai_api_key_encrypted.slice(-8) || '') : null,
      apify_api_key: org.apify_api_key_encrypted ? 
        '*'.repeat(Math.max(0, org.apify_api_key_encrypted.length - 8)) + 
        (org.apify_api_key_encrypted.slice(-8) || '') : null
    };

    res.json(maskedKeys);
  } catch (error) {
    console.error('Error fetching organization API keys:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/organizations/:id/api-keys', async (req, res) => {
  const { id } = req.params;
  const { openai_api_key, apify_api_key } = req.body;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    const updates = {};
    
    // Only update if real API key provided (not masked)
    if (openai_api_key && !openai_api_key.includes('*')) {
      updates.openai_api_key_encrypted = openai_api_key; // TODO: Implement encryption
    }
    
    if (apify_api_key && !apify_api_key.includes('*')) {
      updates.apify_api_key_encrypted = apify_api_key; // TODO: Implement encryption
    }

    if (Object.keys(updates).length === 0) {
      return res.json({ message: 'No API keys updated (masked keys ignored)' });
    }

    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/organizations?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    res.json({ message: 'API keys updated successfully' });
  } catch (error) {
    console.error('Error updating organization API keys:', error);
    res.status(500).json({ error: error.message });
  }
});

// Product URL Analysis endpoint
app.post('/analyze-product-url', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    console.log(`🔍 Analyzing product URL: ${url}`);
    
    // Scrape the website content
    const scrapeResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProductAnalyzer/1.0)'
      }
    });
    
    if (!scrapeResponse.ok) {
      throw new Error(`Failed to fetch URL: ${scrapeResponse.status}`);
    }
    
    const html = await scrapeResponse.text();
    
    // Convert HTML to text (simple extraction - could be enhanced with cheerio)
    const textContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .substring(0, 5000); // Limit to first 5000 chars for AI analysis
    
    // Use OpenAI to analyze the content
    const openaiKey = appState.apiKeys?.openai_api_key;
    if (!openaiKey) {
      return res.status(400).json({ error: 'OpenAI API key not configured' });
    }
    
    const analysisPrompt = `Analyze this website content and extract product/service information.

Website URL: ${url}
Content: ${textContent}

Extract the following information:
1. Product/Service Name - The main product or company name
2. Product Description - What they offer in 1-2 sentences
3. Target Audience - Who would buy/use this (be specific)
4. Value Proposition - The main benefit or problem they solve
5. Industry Category - Choose from: beauty, technology, healthcare, retail, professional_services, food_beverage, education, finance, real_estate, manufacturing, other
6. Key Features - 3-5 main features or benefits (as array)
7. Suggested Messaging Tone - Based on the website's tone, suggest: professional, casual, technical, creative, or friendly

Return ONLY valid JSON in this exact format:
{
  "product_name": "...",
  "product_description": "...",
  "target_audience": "...",
  "value_proposition": "...",
  "industry": "...",
  "product_features": ["feature1", "feature2", "feature3"],
  "messaging_tone": "..."
}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a product analysis expert. Extract key information about products and services from website content.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });
    
    if (!openaiResponse.ok) {
      throw new Error('Failed to analyze with OpenAI');
    }
    
    const aiResult = await openaiResponse.json();
    const analysisText = aiResult.choices[0].message.content;
    
    // Parse the JSON response
    let productData;
    try {
      productData = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', analysisText);
      // Fallback to basic extraction
      productData = {
        product_name: 'Product Name',
        product_description: 'Please review and update this description',
        target_audience: 'Target audience',
        value_proposition: 'Main value proposition',
        industry: 'other',
        product_features: ['Feature 1', 'Feature 2', 'Feature 3'],
        messaging_tone: 'professional'
      };
    }
    
    // Add the URL and timestamp
    productData.product_url = url;
    productData.product_analyzed_at = new Date().toISOString();
    
    console.log('✅ Product analysis complete:', productData.product_name);
    res.json({
      success: true,
      data: productData,
      message: 'Product details extracted successfully. Please review and customize as needed.'
    });
    
  } catch (error) {
    console.error('Error analyzing product URL:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to analyze product URL',
      suggestion: 'Please check the URL is accessible and try again, or enter details manually.'
    });
  }
});

// Get product configuration for an organization
app.get('/organizations/:id/product-config', async (req, res) => {
  const { id } = req.params;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(
      `${cleanUrl}/rest/v1/organizations?id=eq.${id}&select=product_url,product_name,product_description,value_proposition,target_audience,industry,product_features,product_examples,messaging_tone,product_analyzed_at,custom_icebreaker_prompt`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const organizations = await response.json();
    if (organizations.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json(organizations[0]);
  } catch (error) {
    console.error('Error fetching product config:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update product configuration for an organization
app.put('/organizations/:id/product-config', async (req, res) => {
  const { id } = req.params;
  const productConfig = req.body;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    // Build dynamic icebreaker prompt based on product config
    let customPrompt = null;
    if (productConfig.product_name && productConfig.value_proposition) {
      customPrompt = `You're writing the opening lines of a cold email for ${productConfig.product_name}.

**The Person:**
Name: {first_name} {last_name}
Role: {headline}
Company: {company_name}
Location: {location}

**What you learned about their company:**
{website_summaries}

**Your Product/Service:**
- Name: ${productConfig.product_name}
- Description: ${productConfig.product_description || 'Product/service'}
- Value: ${productConfig.value_proposition}
- Target: ${productConfig.target_audience || 'Businesses'}

**Your Job:**
Write 2-3 sentences that:
1. Reference ONE specific thing about their business
2. Connect it to how ${productConfig.product_name} could help
3. Sound human and conversational

**Tone:** ${productConfig.messaging_tone || 'professional'}

Return format:
{{"icebreaker": "your message"}}`;
      
      productConfig.custom_icebreaker_prompt = customPrompt;
    }
    
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/organizations?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(productConfig)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const updated = await response.json();
    res.json({ 
      message: 'Product configuration updated successfully',
      organization: updated[0]
    });
  } catch (error) {
    console.error('Error updating product config:', error);
    res.status(500).json({ error: error.message });
  }
});

// Organization-specific Settings
app.get('/organizations/:id/settings', async (req, res) => {
  const { id } = req.params;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/organizations?id=eq.${id}&select=ai_model_summary,ai_model_icebreaker,ai_temperature,delay_between_ai_calls`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const organizations = await response.json();
    if (organizations.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json(organizations[0]);
  } catch (error) {
    console.error('Error fetching organization settings:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/organizations/:id/settings', async (req, res) => {
  const { id } = req.params;
  const settings = req.body;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/organizations?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating organization settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Usage and billing endpoints
app.get('/organizations/:id/usage', async (req, res) => {
  const { id } = req.params;
  const { month, year } = req.query;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    
    // Build date filter for specific month/year or current month
    let dateFilter = '';
    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endDate = `${year}-${(parseInt(month) + 1).toString().padStart(2, '0')}-01`;
      dateFilter = `&created_at=gte.${startDate}&created_at=lt.${endDate}`;
    } else {
      const now = new Date();
      const startOfMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`;
      dateFilter = `&created_at=gte.${startOfMonth}`;
    }
    
    const response = await fetch(`${cleanUrl}/rest/v1/usage_logs?organization_id=eq.${id}${dateFilter}&order=created_at.desc`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const usage = await response.json();
    
    // Calculate summary statistics
    const summary = usage.reduce((acc, log) => {
      acc.totalCost += parseFloat(log.cost) || 0;
      acc.totalCalls += log.quantity || 0;
      
      if (!acc.byType[log.action_type]) {
        acc.byType[log.action_type] = { calls: 0, cost: 0 };
      }
      acc.byType[log.action_type].calls += log.quantity || 0;
      acc.byType[log.action_type].cost += parseFloat(log.cost) || 0;
      
      return acc;
    }, {
      totalCost: 0,
      totalCalls: 0,
      byType: {}
    });

    res.json({
      usage,
      summary,
      period: { month: month || (new Date().getMonth() + 1), year: year || new Date().getFullYear() }
    });
  } catch (error) {
    console.error('Error fetching organization usage:', error);
    res.status(500).json({ error: error.message });
  }
});

// In-memory storage for audiences since the table doesn't exist in Supabase yet
let inMemoryAudiences = [];

// Audience management endpoints
app.get('/audiences', async (req, res) => {
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  const organizationId = appState.currentOrganization;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  if (!organizationId) {
    return res.status(400).json({ error: 'No organization selected. Please select an organization first.' });
  }

  try {
    // Try Supabase first, fallback to in-memory if table doesn't exist
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/audiences?organization_id=eq.${organizationId}&select=*&order=created_at.desc`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const audiences = await response.json();
      
      // For each audience, get the actual contact count from raw_contacts
      const enrichedAudiences = await Promise.all(audiences.map(async (audience) => {
        try {
          // Use proper audience_id column for counting (much faster)
          const contactCountResponse = await fetch(`${cleanUrl}/rest/v1/raw_contacts?audience_id=eq.${audience.id}&select=id&count=exact`, {
            method: 'GET',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'count=exact'
            }
          });
          
          if (contactCountResponse.ok) {
            const countHeader = contactCountResponse.headers.get('Content-Range');
            const totalCount = countHeader ? parseInt(countHeader.split('/')[1]) || 0 : 0;
            
            console.log(`Audience ${audience.id} (${audience.name}) has ${totalCount} contacts`);
            
            return {
              ...audience,
              estimated_contacts: totalCount,
              actual_contacts: totalCount
            };
          }
        } catch (error) {
          console.log(`Could not get contact count for audience ${audience.id}:`, error);
          
          // Fallback to temporary JSON method if column doesn't exist yet
          try {
            const contactsResponse = await fetch(`${cleanUrl}/rest/v1/raw_contacts?select=raw_data_json`, {
              method: 'GET',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (contactsResponse.ok) {
              const contacts = await contactsResponse.json();
              let audienceContactCount = 0;
              
              for (const contact of contacts) {
                const rawData = contact.raw_data_json || {};
                if (rawData._audience_id === audience.id) {
                  audienceContactCount++;
                }
              }
              
              console.log(`Audience ${audience.id} has ${audienceContactCount} contacts (fallback method)`);
              
              return {
                ...audience,
                estimated_contacts: audienceContactCount,
                actual_contacts: audienceContactCount
              };
            }
          } catch (fallbackError) {
            console.log(`Fallback counting also failed for audience ${audience.id}:`, fallbackError);
          }
        }
        
        return {
          ...audience,
          estimated_contacts: 0,
          actual_contacts: 0
        };
      }));
      
      res.json({ audiences: enrichedAudiences });
    } else {
      // Fallback to in-memory storage
      console.log('Supabase audiences table not found, using in-memory storage');
      const filteredAudiences = inMemoryAudiences.filter(aud => aud.organization_id === organizationId);
      res.json({ audiences: filteredAudiences });
    }
  } catch (error) {
    console.error('Error fetching audiences:', error);
    // Fallback to in-memory storage
    const filteredAudiences = inMemoryAudiences.filter(aud => aud.organization_id === organizationId);
    res.json({ audiences: filteredAudiences });
  }
});

app.post('/audiences', async (req, res) => {
  const { name, description, apollo_search_url, notes } = req.body;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  const organizationId = appState.currentOrganization;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  if (!organizationId) {
    return res.status(400).json({ error: 'No organization selected. Please select an organization first.' });
  }

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Audience name is required' });
  }

  try {
    // Try Supabase first, fallback to in-memory if table doesn't exist
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/audiences`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        name: name.trim(),
        description: description || null,
        apollo_search_url: apollo_search_url || null,
        notes: notes || null,
        status: 'active',
        organization_id: organizationId
      })
    });

    if (response.ok) {
      const audience = await response.json();
      res.json({ audience: audience[0] });
    } else {
      // Fallback to in-memory storage
      console.log('Supabase audiences table not found, creating in memory');
      const newAudience = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description || null,
        apollo_search_url: apollo_search_url || null,
        notes: notes || null,
        status: 'active',
        organization_id: organizationId,
        total_urls: 0,
        estimated_contacts: 0,
        scraping_progress: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      inMemoryAudiences.push(newAudience);
      res.json({ audience: newAudience });
    }
  } catch (error) {
    console.error('Error creating audience:', error);
    // Fallback to in-memory storage
    const newAudience = {
      id: `audience-${Date.now()}`,
      name: name.trim(),
      description: description || null,
      apollo_search_url: apollo_search_url || null,
      notes: notes || null,
      status: 'active',
      organization_id: organizationId,
      total_urls: 0,
      estimated_contacts: 0,
      scraping_progress: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    inMemoryAudiences.push(newAudience);
    res.json({ audience: newAudience });
  }
});

app.put('/audiences/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, apollo_search_url, notes, status } = req.body;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (apollo_search_url !== undefined) updateData.apollo_search_url = apollo_search_url;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/audiences?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const audience = await response.json();
    res.json({ audience: audience[0] });
  } catch (error) {
    console.error('Error updating audience:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/audiences/:id', async (req, res) => {
  const { id } = req.params;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/audiences?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    res.json({ message: 'Audience deleted successfully' });
  } catch (error) {
    console.error('Error deleting audience:', error);
    res.status(500).json({ error: error.message });
  }
});

// Audience URL management endpoints
app.get('/audiences/:id/urls', async (req, res) => {
  const { id } = req.params;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/audience_urls?audience_id=eq.${id}&select=*&order=created_at.desc`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const urls = await response.json();
    res.json({ urls });
  } catch (error) {
    console.error('Error fetching audience URLs:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/audiences/:id/urls', async (req, res) => {
  const { id } = req.params;
  const { url, notes } = req.body;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  if (!url || url.trim() === '') {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/audience_urls`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        url: url.trim(),
        notes: notes || null,
        audience_id: id,
        organization_id: appState.currentOrganization,
        status: 'pending',
        total_contacts: 0
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const audienceUrl = await response.json();
    res.json({ url: audienceUrl[0] });
  } catch (error) {
    console.error('Error adding URL to audience:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/audiences/:audienceId/urls/:urlId', async (req, res) => {
  const { urlId } = req.params;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/audience_urls?id=eq.${urlId}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    res.json({ message: 'URL removed from audience successfully' });
  } catch (error) {
    console.error('Error removing URL from audience:', error);
    res.status(500).json({ error: error.message });
  }
});

// Audience scraping endpoint
app.post('/audiences/:id/scrape', async (req, res) => {
  const { id } = req.params;
  const { recordCount } = req.body;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }
  
  if (currentExecution.isRunning) {
    return res.status(400).json({ 
      error: 'Script is already running', 
      currentMode: currentExecution.mode,
      startTime: currentExecution.startTime 
    });
  }
  
  try {
    // Get the URLs from this audience
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const urlsResponse = await fetch(`${cleanUrl}/rest/v1/audience_urls?audience_id=eq.${id}&select=*&order=created_at.desc`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!urlsResponse.ok) {
      throw new Error(`Failed to get audience URLs: HTTP ${urlsResponse.status}`);
    }

    const urls = await urlsResponse.json();
    
    if (urls.length === 0) {
      return res.status(400).json({ error: 'No URLs found in this audience' });
    }

    console.log(`🎯 Starting audience scraping for ${urls.length} URLs`);
    
    // Use the first URL for now (in the future, you might want to process multiple URLs)
    const firstUrl = urls[0].url;
    
    // Clear previous logs
    currentExecution.logs = [];
    currentExecution.isRunning = true;
    currentExecution.startTime = new Date().toISOString();
    currentExecution.mode = 'audience';
    currentExecution.status = 'starting';

    console.log(`🚀 Starting audience scraping with URL: ${firstUrl}`);

    const scriptPath = path.join(__dirname, 'lead_generation', 'main.py');
    const args = [scriptPath, 'test']; // Use test mode for audience scraping
    
    // Set up environment variables
    const scriptEnv = { 
      ...process.env, 
      PYTHONUNBUFFERED: '1',
      TEST_APOLLO_URL: firstUrl
    };
    
    // Add current organization context if available
    if (appState.currentOrganization) {
      scriptEnv.CURRENT_ORGANIZATION_ID = appState.currentOrganization;
      console.log(`🏢 Running audience scraping in organization context: ${appState.currentOrganization}`);
    }
    
    // Add record count if provided
    if (recordCount) {
      scriptEnv.RECORD_COUNT = recordCount.toString();
    }
    
    // Add audience context
    scriptEnv.AUDIENCE_ID = id;
    
    const scriptProcess = spawn(pythonCmd, args, {
      cwd: path.join(__dirname, 'lead_generation'),
      env: scriptEnv
    });

    currentExecution.process = scriptProcess;
    currentExecution.status = 'running';

    // Handle script output
    scriptProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Audience scraping stdout:', output);
      currentExecution.logs.push({
        timestamp: new Date().toISOString(),
        type: 'stdout',
        message: output
      });
      
      // Keep only last 1000 log entries
      if (currentExecution.logs.length > 1000) {
        currentExecution.logs = currentExecution.logs.slice(-1000);
      }
    });

    scriptProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.log('Audience scraping stderr:', output);
      currentExecution.logs.push({
        timestamp: new Date().toISOString(),
        type: 'stderr',
        message: output
      });
    });

    scriptProcess.on('close', (code) => {
      const endTime = new Date().toISOString();
      const duration = new Date(endTime).getTime() - new Date(currentExecution.startTime).getTime();
      
      console.log(`Audience scraping process exited with code ${code}`);
      
      // Save execution history
      const historyEntry = {
        id: Date.now(),
        mode: 'audience',
        audienceId: id,
        startTime: currentExecution.startTime,
        endTime: endTime,
        duration: Math.round(duration / 1000),
        exitCode: code,
        success: code === 0,
        logCount: currentExecution.logs.length
      };
      
      executionHistory.unshift(historyEntry);
      if (executionHistory.length > 50) {
        executionHistory = executionHistory.slice(0, 50);
      }
      
      // Reset current execution
      currentExecution.isRunning = false;
      currentExecution.process = null;
      currentExecution.status = code === 0 ? 'completed' : 'failed';
      currentExecution.campaignId = null;
    });
    
    res.json({ 
      message: `Audience scraping started for ${urls.length} URLs`,
      audienceId: id,
      urlCount: urls.length,
      firstUrl: firstUrl,
      status: 'running'
    });
    
  } catch (error) {
    console.error('Error starting audience scrape:', error);
    res.status(500).json({ error: error.message });
  }
});

// Campaign management endpoints
app.get('/campaigns', async (req, res) => {
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  const organizationId = appState.currentOrganization;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  if (!organizationId) {
    return res.status(400).json({ error: 'No organization selected. Please select an organization first.' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/v_campaign_overview?organization_id=eq.${organizationId}&select=*&order=created_at.desc`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const campaigns = await response.json();
    res.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/campaigns', async (req, res) => {
  const { name, description, status = 'active', tags = [], priority = 0 } = req.body;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  const organizationId = appState.currentOrganization;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  if (!organizationId) {
    return res.status(400).json({ error: 'No organization selected. Please select an organization first.' });
  }

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Campaign name is required' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/campaigns`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        name: name.trim(),
        description: description || null,
        status,
        tags,
        priority,
        organization_id: organizationId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const campaign = await response.json();
    res.json({ campaign: campaign[0] });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/campaigns/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, status, tags, priority, audience_id } = req.body;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (tags !== undefined) updateData.tags = tags;
    if (priority !== undefined) updateData.priority = priority;
    if (audience_id !== undefined) updateData.audience_id = audience_id;

    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/campaigns?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const campaign = await response.json();
    res.json({ campaign: campaign[0] });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/campaigns/:id', async (req, res) => {
  const { id } = req.params;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/campaigns?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/campaigns/:id/urls', async (req, res) => {
  const { id } = req.params;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/search_urls?campaign_id=eq.${id}&select=*&order=created_at.desc`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const urls = await response.json();
    res.json({ urls });
  } catch (error) {
    console.error('Error fetching campaign URLs:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/campaigns/:id/urls', async (req, res) => {
  const { id } = req.params;
  const { url, notes } = req.body;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  if (!url || url.trim() === '') {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    
    // First, check if URL already exists for this campaign
    const checkResponse = await fetch(`${cleanUrl}/rest/v1/search_urls?url=eq.${encodeURIComponent(url.trim())}&campaign_id=eq.${id}`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (checkResponse.ok) {
      const existingUrls = await checkResponse.json();
      
      if (existingUrls && existingUrls.length > 0) {
        // URL already exists for this campaign, update it to pending
        const updateResponse = await fetch(`${cleanUrl}/rest/v1/search_urls?id=eq.${existingUrls[0].id}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            status: 'pending',
            notes: notes || existingUrls[0].notes
          })
        });
        
        if (!updateResponse.ok) {
          throw new Error(`Failed to update URL: HTTP ${updateResponse.status}`);
        }
        
        const updatedUrl = await updateResponse.json();
        console.log(`Updated existing URL to pending status for campaign ${id}`);
        return res.json({ url: updatedUrl[0] });
      }
    }
    
    // URL doesn't exist for this campaign, create new one
    const response = await fetch(`${cleanUrl}/rest/v1/search_urls`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        url: url.trim(),
        notes: notes || null,
        campaign_id: id,
        status: 'pending',
        organization_id: appState.currentOrganization
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // If it's a duplicate key error, try to find and update the existing URL
      if (errorText.includes('duplicate key')) {
        console.log('URL exists in database, attempting to create a new entry with campaign link...');
        
        // Create a new URL entry with a unique identifier (append campaign ID to make it unique)
        const uniqueUrl = `${url.trim()}#campaign=${id}`;
        const retryResponse = await fetch(`${cleanUrl}/rest/v1/search_urls`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            url: uniqueUrl,
            notes: `${notes || 'URL for campaign'} (Campaign-specific)`,
            campaign_id: id,
            status: 'pending',
            organization_id: appState.currentOrganization
          })
        });
        
        if (!retryResponse.ok) {
          throw new Error(`HTTP ${retryResponse.status}: ${await retryResponse.text()}`);
        }
        
        const searchUrl = await retryResponse.json();
        console.log(`Created campaign-specific URL variant for campaign ${id}`);
        return res.json({ url: searchUrl[0] });
      }
      
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const searchUrl = await response.json();
    res.json({ url: searchUrl[0] });
  } catch (error) {
    console.error('Error adding URL to campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/campaigns/:campaignId/urls/:urlId', async (req, res) => {
  const { urlId } = req.params;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/search_urls?id=eq.${urlId}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    res.json({ message: 'URL removed from campaign successfully' });
  } catch (error) {
    console.error('Error removing URL from campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

// Script execution endpoints
app.post('/run-script', (req, res) => {
  const { mode, testUrl, recordCount, campaignId } = req.body;
  
  if (currentExecution.isRunning) {
    return res.status(400).json({ 
      error: 'Script is already running', 
      currentMode: currentExecution.mode,
      startTime: currentExecution.startTime 
    });
  }

  // Clear previous logs
  currentExecution.logs = [];
  currentExecution.isRunning = true;
  currentExecution.startTime = new Date().toISOString();
  currentExecution.mode = mode;
  currentExecution.status = 'starting';
  currentExecution.campaignId = campaignId || null;

  console.log(`🚀 Starting script execution in ${mode} mode`);
  console.log(`📋 Script parameters:`, {
    mode,
    campaignId,
    recordCount,
    testUrl,
    organization: appState.currentOrganization
  });

  try {
    const scriptPath = path.join(__dirname, 'lead_generation', 'main.py');
    const args = [scriptPath];
    
    // Add mode-specific arguments
    if (mode === 'test') {
      args.push('test');
      console.log('🧪 Running in test mode');
    } else if (mode === 'once') {
      args.push('once');
      console.log('🔄 Running once mode');
    } else if (mode === 'campaign' && campaignId) {
      args.push('campaign');
      console.log(`🎯 Running campaign mode for campaign: ${campaignId}`);
    }

    // Set up environment variables including record count and organization context
    const scriptEnv = { 
      ...process.env, 
      PYTHONUNBUFFERED: '1'
    };
    
    // Add current organization context if available
    if (appState.currentOrganization) {
      scriptEnv.CURRENT_ORGANIZATION_ID = appState.currentOrganization;
      console.log(`🏢 Running script in organization context: ${appState.currentOrganization}`);
    } else {
      console.log('⚠️ WARNING: No organization context - this may cause issues!');
    }
    
    // Add record count if provided
    if (recordCount) {
      scriptEnv.RECORD_COUNT = recordCount.toString();
      console.log(`📊 Record count set to: ${recordCount}`);
    }
    
    // Add test URL if provided
    if (testUrl) {
      scriptEnv.TEST_APOLLO_URL = testUrl;
      console.log(`🔗 Test URL provided: ${testUrl.substring(0, 50)}...`);
    }
    
    // Add campaign ID if provided
    if (campaignId) {
      scriptEnv.CAMPAIGN_ID = campaignId;
      console.log(`🎯 Campaign ID environment variable set: ${campaignId}`);
    }
    
    console.log('🐍 Executing Python script with environment:', {
      CURRENT_ORGANIZATION_ID: scriptEnv.CURRENT_ORGANIZATION_ID,
      CAMPAIGN_ID: scriptEnv.CAMPAIGN_ID,
      RECORD_COUNT: scriptEnv.RECORD_COUNT,
      hasTestUrl: !!scriptEnv.TEST_APOLLO_URL
    });
    
    const scriptProcess = spawn(pythonCmd, args, {
      cwd: path.join(__dirname, 'lead_generation'),
      env: scriptEnv
    });

    currentExecution.process = scriptProcess;
    currentExecution.status = 'running';

    // Handle script output
    scriptProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Script stdout:', output);
      currentExecution.logs.push({
        timestamp: new Date().toISOString(),
        type: 'stdout',
        message: output
      });
      
      // Keep only last 1000 log entries
      if (currentExecution.logs.length > 1000) {
        currentExecution.logs = currentExecution.logs.slice(-1000);
      }
    });

    scriptProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.log('Script stderr:', output);
      currentExecution.logs.push({
        timestamp: new Date().toISOString(),
        type: 'stderr',
        message: output
      });
    });

    scriptProcess.on('close', (code) => {
      const endTime = new Date().toISOString();
      const duration = new Date(endTime) - new Date(currentExecution.startTime);
      
      console.log(`Script execution finished with code: ${code}`);
      
      // Add to history
      executionHistory.unshift({
        id: Date.now(),
        mode: currentExecution.mode,
        startTime: currentExecution.startTime,
        endTime: endTime,
        duration: Math.round(duration / 1000), // seconds
        exitCode: code,
        success: code === 0,
        logCount: currentExecution.logs.length
      });
      
      // Keep only last 50 executions
      if (executionHistory.length > 50) {
        executionHistory = executionHistory.slice(0, 50);
      }

      currentExecution.isRunning = false;
      currentExecution.process = null;
      currentExecution.status = code === 0 ? 'completed' : 'failed';
      currentExecution.campaignId = null;
      
      // Keep logs available for a while after completion
      setTimeout(() => {
        if (!currentExecution.isRunning) {
          currentExecution.logs = [];
          currentExecution.status = 'idle';
        }
      }, 300000); // 5 minutes
    });

    res.json({
      message: `Script started in ${mode} mode`,
      executionId: Date.now(),
      startTime: currentExecution.startTime
    });

  } catch (error) {
    currentExecution.isRunning = false;
    currentExecution.status = 'error';
    currentExecution.campaignId = null;
    console.error('Script execution error:', error);
    res.status(500).json({ error: 'Failed to start script: ' + error.message });
  }
});

app.get('/script-status', (req, res) => {
  res.json({
    isRunning: currentExecution.isRunning,
    mode: currentExecution.mode,
    campaignId: currentExecution.campaignId,
    startTime: currentExecution.startTime,
    status: currentExecution.status,
    logCount: currentExecution.logs.length,
    uptime: currentExecution.startTime ? 
      Math.round((new Date() - new Date(currentExecution.startTime)) / 1000) : 0
  });
});

app.post('/stop-script', (req, res) => {
  if (!currentExecution.isRunning || !currentExecution.process) {
    return res.status(400).json({ error: 'No script is currently running' });
  }

  try {
    console.log('🛑 Stopping script execution');
    currentExecution.process.kill('SIGTERM');
    
    // Force kill after 5 seconds if it doesn't stop gracefully
    setTimeout(() => {
      if (currentExecution.process && currentExecution.isRunning) {
        currentExecution.process.kill('SIGKILL');
      }
    }, 5000);

    currentExecution.status = 'stopping';
    res.json({ message: 'Script stop signal sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop script: ' + error.message });
  }
});

app.get('/script-logs', (req, res) => {
  const { since } = req.query;
  let logs = currentExecution.logs;
  
  if (since) {
    const sinceTime = new Date(since);
    logs = logs.filter(log => new Date(log.timestamp) > sinceTime);
  }
  
  res.json({
    logs: logs,
    totalCount: currentExecution.logs.length,
    isRunning: currentExecution.isRunning,
    status: currentExecution.status
  });
});

app.get('/execution-history', (req, res) => {
  res.json({
    history: executionHistory,
    currentExecution: currentExecution.isRunning ? {
      mode: currentExecution.mode,
      startTime: currentExecution.startTime,
      status: currentExecution.status,
      uptime: Math.round((new Date() - new Date(currentExecution.startTime)) / 1000)
    } : null
  });
});

// ============================================
// Google Maps Campaign Endpoints
// ============================================

// Google Maps campaigns with file persistence
const GMAPS_CAMPAIGNS_FILE = path.join(__dirname, 'gmaps-campaigns.json');
// Campaigns now managed by Supabase
// let gmapsCampaigns = [];

// Load campaigns from file on startup
function loadGMapsCampaigns() {
  try {
    if (fs.existsSync(GMAPS_CAMPAIGNS_FILE)) {
      const data = fs.readFileSync(GMAPS_CAMPAIGNS_FILE, 'utf8');
      gmapsCampaigns = JSON.parse(data);
      console.log(`✅ Loaded ${gmapsCampaigns.length} Google Maps campaigns from file`);
    } else {
      console.log('📁 No saved Google Maps campaigns found, starting fresh');
    }
  } catch (error) {
    console.error('❌ Error loading Google Maps campaigns:', error);
    gmapsCampaigns = [];
  }
}

// Save campaigns to file
function saveGMapsCampaigns() {
  try {
    fs.writeFileSync(GMAPS_CAMPAIGNS_FILE, JSON.stringify(gmapsCampaigns, null, 2));
    console.log(`💾 Saved ${gmapsCampaigns.length} Google Maps campaigns to file`);
  } catch (error) {
    console.error('❌ Error saving Google Maps campaigns:', error);
  }
}

// Campaigns are now loaded from Supabase on demand
// loadGMapsCampaigns();

app.get('/api/gmaps/campaigns', async (req, res) => {
  console.log('📍 Fetching Google Maps campaigns from Supabase');
  try {
    const campaigns = await gmapsCampaigns.getAll();
    res.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

app.post('/api/gmaps/campaigns/create', async (req, res) => {
  const { name, location, keywords, coverage_profile = 'balanced', description } = req.body;
  
  console.log('📍 Creating Google Maps campaign:', { name, location, keywords });
  
  if (!name || !location || !keywords) {
    return res.status(400).json({ 
      error: 'Name, location, and keywords are required' 
    });
  }
  
  // Parse keywords
  const keywordsArray = typeof keywords === 'string' ? keywords.split(',').map(k => k.trim()) : keywords;
  
  // Analyze ZIP codes for the location (unless it's already a ZIP)
  let zipAnalysis = null;
  const isZipCode = /^\d{5}(-\d{4})?$/.test(location.trim());
  
  if (!isZipCode) {
    try {
      console.log('🤖 Analyzing location for ZIP codes during campaign creation...');
      const { spawn } = require('child_process');
      const path = require('path');
      
      const analyzeZipCodes = () => {
        return new Promise((resolve, reject) => {
          const pythonProcess = spawn('python3', [
            path.join(__dirname, 'analyze_zip_codes.py')
          ]);
          
          const input = JSON.stringify({
            location: location,
            keywords: keywordsArray,
            coverage_profile: coverage_profile
          });
          
          let output = '';
          let error = '';
          
          pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
          });
          
          pythonProcess.stderr.on('data', (data) => {
            error += data.toString();
          });
          
          pythonProcess.on('close', (code) => {
            if (code !== 0) {
              console.error('ZIP analysis error:', error);
              // Try to parse error output for specific error types
              try {
                const errorResult = JSON.parse(output || '{}');
                resolve(errorResult); // Return error info
              } catch (e) {
                resolve(null); // Fallback if can't parse
              }
            } else {
              try {
                const result = JSON.parse(output);
                resolve(result);
              } catch (e) {
                console.error('Failed to parse ZIP analysis:', e);
                resolve(null);
              }
            }
          });
          
          pythonProcess.stdin.write(input);
          pythonProcess.stdin.end();
        });
      };
      
      zipAnalysis = await analyzeZipCodes();
      
      // Check for errors in ZIP analysis
      if (zipAnalysis && zipAnalysis.error_type === 'openai_quota') {
        console.error('❌ OpenAI quota exceeded during ZIP analysis');
        return res.status(400).json({
          error: 'OpenAI API quota exceeded',
          message: 'Unable to analyze ZIP codes - OpenAI API quota has been exceeded. Please check your OpenAI account or add credits.',
          details: 'ZIP code analysis requires OpenAI API access to intelligently determine optimal coverage areas.'
        });
      }
      
      if (!zipAnalysis || !zipAnalysis.zip_codes || zipAnalysis.zip_codes.length === 0) {
        console.error('❌ ZIP analysis failed or returned no ZIP codes');
        return res.status(400).json({
          error: 'ZIP code analysis failed',
          message: 'Unable to determine ZIP codes for the specified location. Please try a more specific location or enter ZIP codes directly.',
          details: zipAnalysis?.reasoning || 'Unknown error during ZIP analysis'
        });
      }
      
      console.log(`✅ Pre-analyzed ${zipAnalysis.zip_codes.length} ZIP codes for campaign`);
    } catch (error) {
      console.error('Error analyzing ZIP codes:', error);
      return res.status(500).json({
        error: 'ZIP analysis error',
        message: 'An unexpected error occurred while analyzing ZIP codes',
        details: error.message
      });
    }
  }
  
  const campaignData = {
    name,
    location,
    keywords: keywordsArray,
    coverage_profile,
    description,
    status: 'draft',
    target_zip_count: zipAnalysis?.zip_codes?.length || (coverage_profile === 'budget' ? 5 : coverage_profile === 'balanced' ? 10 : 20),
    estimated_cost: zipAnalysis?.cost_estimates?.total_cost || (coverage_profile === 'budget' ? 25 : coverage_profile === 'balanced' ? 50 : 100),
    total_businesses_found: 0,
    total_emails_found: 0,
    total_facebook_pages_found: 0,
    actual_cost: 0,
    // Store ZIP codes if available
    zipCodes: zipAnalysis?.zip_codes || []
  };
  
  try {
    const newCampaign = await gmapsCampaigns.create(campaignData);
    
    res.status(201).json({ 
      campaign: newCampaign,
      message: 'Campaign created successfully',
      zipAnalysis: zipAnalysis
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

app.post('/api/gmaps/campaigns/:campaignId/execute', async (req, res) => {
  const { campaignId } = req.params;
  const { max_businesses_per_zip = 200 } = req.body;
  
  console.log('📍 Executing Google Maps campaign:', campaignId);
  
  let campaign;
  try {
    campaign = await gmapsCampaigns.getById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return res.status(500).json({ error: 'Failed to fetch campaign' });
  }
  
  // Get Apify API key
  const apifyKey = appState.apiKeys.apify_api_key;
  if (!apifyKey) {
    return res.status(400).json({ error: 'Apify API key not configured' });
  }
  
  // Update campaign status in Supabase
  try {
    await gmapsCampaigns.update(campaignId, {
      status: 'running',
      started_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating campaign status:', error);
  }
  campaign.businesses = [];
  
  res.json({
    message: 'Campaign execution started',
    campaign_id: campaignId,
    status: 'running'
  });
  
  // Run Apify scraper asynchronously
  (async () => {
    console.log(`🔄 Starting async execution for campaign ${campaignId}`);
    try {
      console.log('🚀 Starting Google Maps with Contact Details scraper');
      const client = new ApifyClient({ token: apifyKey });
      
      // ============================================
      // STEP 1: ANALYZE LOCATION TO GET ZIP CODES
      // ============================================
      let zipCodes = [];
      
      // Check if location appears to be a ZIP code already
      const isZipCode = /^\d{5}(-\d{4})?$/.test(campaign.location.trim());
      
      if (isZipCode) {
        // Single ZIP code provided
        zipCodes = [{
          zip: campaign.location.trim(),
          neighborhood: 'Direct ZIP',
          density_score: 5,
          relevance_score: 10,
          estimated_businesses: 250
        }];
        console.log('📍 Using single ZIP code:', campaign.location);
      } else {
        // Analyze location to get optimal ZIP codes
        console.log('🤖 Analyzing location to determine optimal ZIP codes...');
        
        try {
          const { spawn } = require('child_process');
          const path = require('path');
          
          const analyzeZipCodes = () => {
            return new Promise((resolve, reject) => {
              const pythonProcess = spawn('python3', [
                path.join(__dirname, 'analyze_zip_codes.py')
              ]);
              
              const input = JSON.stringify({
                location: campaign.location,
                keywords: campaign.keywords,
                coverage_profile: campaign.coverage_profile || 'balanced'
              });
              
              let output = '';
              let error = '';
              
              pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
              });
              
              pythonProcess.stderr.on('data', (data) => {
                error += data.toString();
              });
              
              pythonProcess.on('close', (code) => {
                if (code !== 0) {
                  reject(new Error(`ZIP analysis failed: ${error}`));
                } else {
                  try {
                    const result = JSON.parse(output);
                    resolve(result);
                  } catch (e) {
                    reject(new Error(`Failed to parse ZIP analysis: ${e.message}`));
                  }
                }
              });
              
              // Send input to Python script
              pythonProcess.stdin.write(input);
              pythonProcess.stdin.end();
            });
          };
          
          const zipAnalysis = await analyzeZipCodes();
          zipCodes = zipAnalysis.zip_codes || [];
          
          // Store ZIP analysis in campaign
          campaign.zipAnalysis = zipAnalysis;
          campaign.target_zip_count = zipCodes.length;
          
          console.log(`✅ Selected ${zipCodes.length} ZIP codes for ${campaign.location}`);
          zipCodes.forEach(z => {
            console.log(`   - ${z.zip} (${z.neighborhood}): ~${z.estimated_businesses} businesses`);
          });
          
        } catch (error) {
          console.error('❌ ZIP code analysis failed:', error.message);
          console.log('⚠️ Falling back to city-wide search');
          // Fall back to searching the location as-is
          zipCodes = [{
            zip: campaign.location,
            neighborhood: 'Full Area',
            density_score: 5,
            relevance_score: 5,
            estimated_businesses: 500
          }];
        }
      }
      
      // Store ZIP codes in campaign
      campaign.zipCodes = zipCodes;
      
      // ============================================
      // STEP 2: PREPARE SEARCH STRINGS WITH ZIP CODES
      // ============================================
      const searchStrings = [];
      
      if (zipCodes.length > 0 && zipCodes[0].zip !== campaign.location) {
        // Use ZIP code-based searches
        campaign.keywords.forEach(keyword => {
          zipCodes.forEach(zipData => {
            const searchQuery = `${keyword} ${zipData.zip}`;
            searchStrings.push({
              query: searchQuery,
              zip: zipData.zip,
              neighborhood: zipData.neighborhood
            });
          });
        });
        console.log(`📍 Generated ${searchStrings.length} ZIP-based search queries`);
      } else {
        // Fall back to location-based search
        campaign.keywords.forEach(keyword => {
          const searchQuery = `${keyword} ${campaign.location}`;
          searchStrings.push({
            query: searchQuery,
            zip: campaign.location,
            neighborhood: 'Full Area'
          });
        });
        console.log('📍 Using location-based search queries');
      }
      
      console.log('📍 Google Maps search queries:', searchStrings.map(s => s.query));
      
      // Run Google Maps with Contact Details Scraper (lukaskrivka)
      const googleMapsActor = 'WnMxbsRLNbPeYL6ge'; // Google Maps with Contact Details
      const googleMapsInput = {
        searchStringsArray: searchStrings.map(s => s.query), // Extract just the query strings
        maxCrawledPlacesPerSearch: max_businesses_per_zip || 200,
        language: 'en',
        exportPlaceUrls: false,
        skipClosedPlaces: true,
        // This scraper automatically gets contact details including emails
        scrapeDirectEmails: true,
        scrapeWebsiteEmails: true
      };
      
      console.log('📍 Sending to Google Maps Scraper:', JSON.stringify(googleMapsInput, null, 2));
      
      console.log(`📡 Calling Apify actor ${googleMapsActor} for campaign ${campaignId}...`);
      const googleMapsRun = await client.actor(googleMapsActor).call(googleMapsInput);
      console.log(`✅ Apify run started with ID: ${googleMapsRun.id}`);
      
      // Get Google Maps results
      console.log(`📥 Fetching results from dataset ${googleMapsRun.defaultDatasetId}...`);
      const { items } = await client.dataset(googleMapsRun.defaultDatasetId).listItems();
      console.log(`📊 Retrieved ${items.length} items from Apify`);
      
      console.log(`✅ Found ${items.length} businesses from Google Maps`);
      
      // Process Google Maps results - extract businesses with contact details
      const facebookUrls = [];
      const businessesMap = new Map(); // Use map to deduplicate by place ID
      
      // Create a mapping function to determine which ZIP/search query found each business
      const getSourceZipForBusiness = (place) => {
        // Try to determine which search query found this business
        // The searchString field in the result tells us which query found it
        const searchString = place.searchString || '';
        
        // Find matching search query to get ZIP
        const matchedSearch = searchStrings.find(s => s.query === searchString);
        if (matchedSearch) {
          return {
            sourceZip: matchedSearch.zip,
            sourceNeighborhood: matchedSearch.neighborhood,
            sourceQuery: matchedSearch.query
          };
        }
        
        // Fallback: extract ZIP from address if present
        const addressZip = place.postalCode || place.zipCode || '';
        if (addressZip) {
          return {
            sourceZip: addressZip,
            sourceNeighborhood: 'From Address',
            sourceQuery: searchString
          };
        }
        
        // Default fallback
        return {
          sourceZip: campaign.location,
          sourceNeighborhood: 'Unknown',
          sourceQuery: searchString
        };
      };
      
      items.forEach((place, index) => {
        // Debug: log first place to see actual field names
        if (index === 0) {
          console.log('📍 Sample place data fields:', Object.keys(place));
          if (place.searchString) console.log('   - searchString:', place.searchString);
          if (place.facebooks) console.log('   - facebooks:', place.facebooks);
          if (place.emails) {
            console.log('   - emails:', place.emails);
            console.log('   - emails type:', typeof place.emails);
            console.log('   - emails length:', Array.isArray(place.emails) ? place.emails.length : 'not array');
            if (Array.isArray(place.emails) && place.emails.length > 0) {
              console.log('   - first email:', place.emails[0]);
              console.log('   - first email type:', typeof place.emails[0]);
              console.log('   - first email truthy?:', !!place.emails[0]);
            }
          }
        }
        
        // Google Maps with Contact Details returns place objects
        const placeId = place.placeId || place.place_id || '';
        const name = place.title || place.name || '';
        
        if (placeId && !businessesMap.has(placeId)) {
          // Get source ZIP information
          const zipInfo = getSourceZipForBusiness(place);
          // Extract Facebook URL if present - facebooks is an array
          let facebookUrl = '';
          if (place.facebooks && Array.isArray(place.facebooks) && place.facebooks.length > 0) {
            facebookUrl = place.facebooks[0]; // Take the first Facebook URL
            facebookUrls.push(facebookUrl);
          } else if (place.facebookUrl || place.facebook) {
            facebookUrl = place.facebookUrl || place.facebook;
            if (facebookUrl) facebookUrls.push(facebookUrl);
          }
          
          // Extract email - properly handle emails array and filter empty strings
          let extractedEmail = '';
          if (place.email && place.email.trim()) {
            extractedEmail = place.email.trim();
          } else if (Array.isArray(place.emails) && place.emails.length > 0) {
            // Find first non-empty email in the array
            const validEmail = place.emails.find(e => e && e.trim());
            if (validEmail) {
              extractedEmail = validEmail.trim();
            }
          } else if (place.directEmail && place.directEmail.trim()) {
            extractedEmail = place.directEmail.trim();
          }
          
          businessesMap.set(placeId, {
            placeId,
            name,
            address: place.address || '',
            phone: place.phone || place.phoneNumber || '',
            website: place.website || place.url || '',
            email: extractedEmail,
            facebookUrl,
            linkedInUrl: place.linkedIn || place.linkedInUrl || '',
            category: place.category || place.categoryName || '',
            rating: place.rating || place.stars || 0,
            reviews: place.reviewsCount || place.numberOfReviews || 0,
            city: place.city || '',
            postalCode: place.postalCode || place.zipCode || '',
            lat: place.location?.lat || place.latitude || 0,
            lng: place.location?.lng || place.longitude || 0,
            description: place.description || '',
            openingHours: place.openingHours || {},
            imageUrl: place.imageUrl || '',
            plusCode: place.plusCode || '',
            // ZIP tracking fields
            sourceZip: zipInfo.sourceZip,
            sourceNeighborhood: zipInfo.sourceNeighborhood,
            sourceQuery: zipInfo.sourceQuery
          });
        }
      });
      
      // Convert map to array - businesses already have all the data from Google Maps
      campaign.businesses = Array.from(businessesMap.values());
      
      console.log(`📘 Found ${campaign.businesses.length} businesses from Google Maps`);
      
      // ============================================
      // Phase 2: CASCADING EMAIL ENRICHMENT STRATEGY
      // ============================================
      
      // Initialize statistics tracking
      const enrichmentStats = {
        totalBusinesses: campaign.businesses.length,
        hasEmailFromGoogleMaps: 0,
        enrichedFromFacebook: 0,
        enrichedFromSearch: 0,
        stillNoEmail: 0
      };
      
      // Categorize businesses based on what data they have
      const businessesWithEmail = [];
      const businessesNoEmailWithFB = [];
      const businessesNoEmailNoFB = [];
      
      campaign.businesses.forEach(business => {
        if (business.email) {
          // Already has email - skip all enrichment
          businessesWithEmail.push(business);
          enrichmentStats.hasEmailFromGoogleMaps++;
          console.log(`  ✅ ${business.name} already has email: ${business.email}`);
        } else if (business.facebookUrl) {
          // No email but has Facebook - needs FB enrichment
          businessesNoEmailWithFB.push(business);
          console.log(`  📘 ${business.name} has Facebook but no email`);
        } else {
          // No email and no Facebook - needs search then enrichment
          businessesNoEmailNoFB.push(business);
          console.log(`  🔍 ${business.name} needs Facebook search`);
        }
      });
      
      console.log('\n📊 Business Categorization:');
      console.log(`  - With email (skip enrichment): ${businessesWithEmail.length}`);
      console.log(`  - No email, has Facebook: ${businessesNoEmailWithFB.length}`);
      console.log(`  - No email, no Facebook: ${businessesNoEmailNoFB.length}`);
      
      // ============================================
      // Phase 2A: ENRICH BUSINESSES WITH FACEBOOK BUT NO EMAIL
      // ============================================
      let fbUrlBusinessMap = new Map(); // Declare at outer scope for reuse
      
      if (businessesNoEmailWithFB.length > 0) {
        console.log(`\n🚀 Starting Facebook enrichment for ${businessesNoEmailWithFB.length} businesses`);
        
        try {
          // Collect and deduplicate Facebook URLs from businesses that need enrichment
          const uniqueFbUrls = new Set();
          
          businessesNoEmailWithFB.forEach(business => {
            if (business.facebookUrl && business.facebookUrl.includes('facebook.com')) {
              // Normalize Facebook URL (remove trailing slashes, query params)
              let normalizedUrl = business.facebookUrl.split('?')[0].replace(/\/$/, '');
              
              // Skip invalid URLs
              if (!normalizedUrl.startsWith('http')) {
                normalizedUrl = 'https://' + normalizedUrl;
              }
              
              uniqueFbUrls.add(normalizedUrl);
              
              // Map URL to businesses (multiple businesses might have same FB page)
              if (!fbUrlBusinessMap.has(normalizedUrl)) {
                fbUrlBusinessMap.set(normalizedUrl, []);
              }
              fbUrlBusinessMap.get(normalizedUrl).push(business);
            }
          });
          
          const fbUrlsToEnrich = Array.from(uniqueFbUrls);
          console.log(`  📘 Deduped ${businessesNoEmailWithFB.length} businesses to ${fbUrlsToEnrich.length} unique Facebook pages`);
          
          if (fbUrlsToEnrich.length > 0) {
            // Run Facebook Pages Scraper
            const fbRun = await client.actor('4Hv5RhChiaDk6iwad').call({
              startUrls: fbUrlsToEnrich.map(url => ({ url })),
              maxPagesToScrap: 1,
              scrapeAbout: true,
              scrapeReviews: false,
              scrapePosts: false,
              scrapeServices: true,
              scrapeAdditionalInfo: true,
              scrapeDirectEmails: true,
              scrapeWebsiteEmails: true
            });
            
            // Get Facebook enrichment results
            const { items: fbItems } = await client.dataset(fbRun.defaultDatasetId).listItems();
            
            console.log(`  ✅ Enriched ${fbItems.length} Facebook pages`);
            
            // Merge Facebook data back into businesses
            fbItems.forEach(fbItem => {
              // Normalize the URL from results to match our map
              const normalizedResultUrl = (fbItem.url || fbItem.facebookUrl || fbItem.pageUrl || '').split('?')[0].replace(/\/$/, '');
              
              // Find all businesses that have this Facebook page
              const businesses = fbUrlBusinessMap.get(normalizedResultUrl) || [];
              
              // Also try to match by page URL or facebook URL fields
              if (businesses.length === 0 && fbItem.facebookUrl) {
                const altNormalizedUrl = fbItem.facebookUrl.split('?')[0].replace(/\/$/, '');
                businesses.push(...(fbUrlBusinessMap.get(altNormalizedUrl) || []));
              }
              
              businesses.forEach(business => {
                // Check multiple possible email fields
                let foundEmail = '';
                
                // Check direct email field
                if (fbItem.email && fbItem.email.trim()) {
                  foundEmail = fbItem.email.trim();
                }
                // Check emails array
                else if (fbItem.emails && Array.isArray(fbItem.emails) && fbItem.emails.length > 0) {
                  foundEmail = fbItem.emails[0].trim();
                }
                // Check contact_email field
                else if (fbItem.contact_email && fbItem.contact_email.trim()) {
                  foundEmail = fbItem.contact_email.trim();
                }
                // Check businessEmail field
                else if (fbItem.businessEmail && fbItem.businessEmail.trim()) {
                  foundEmail = fbItem.businessEmail.trim();
                }
                // Check in info object if it exists
                else if (fbItem.info && typeof fbItem.info === 'object') {
                  if (fbItem.info.email) {
                    foundEmail = fbItem.info.email.trim();
                  }
                }
                
                if (foundEmail) {
                  business.email = foundEmail;
                  business.emailSource = 'facebook'; // Track that this came from Facebook
                  enrichmentStats.enrichedFromFacebook++;
                  console.log(`    ✉️ Found email for ${business.name}: ${foundEmail}`);
                  
                  // Add additional Facebook data
                  business.facebookData = {
                    likes: fbItem.likes || 0,
                    email: foundEmail,
                    phone: fbItem.phone || '',
                    website: fbItem.website || fbItem.websites?.[0] || '',
                    rawData: fbItem // Store raw data for enrichment saving
                  };
                } else {
                  console.log(`    ❌ No email found for ${business.name} on Facebook page`);
                }
              });
            });
          }
        } catch (fbError) {
          console.error('  ⚠️ Facebook enrichment failed:', fbError.message);
        }
      }
      
      // ============================================
      // Phase 2B: SEARCH FOR FACEBOOK PAGES AND ENRICH
      // ============================================
      if (businessesNoEmailNoFB.length > 0) {
        console.log(`\n🔍 Searching for Facebook pages for ${businessesNoEmailNoFB.length} businesses`);
        
        try {
          // Use Google Search to find Facebook pages
          const googleSearchActor = 'nFJndFXA5zjCTuudP'; // Google Search Results Scraper
          const foundFacebookUrls = [];
          
          // Create all search queries at once
          const searchQueries = businessesNoEmailNoFB.map(business => 
            `"${business.name}" site:facebook.com ${business.city || campaign.location}`
          ).join('\n');
          
          console.log(`  📡 Running Google Search for all ${businessesNoEmailNoFB.length} businesses in one batch...`);
          
          // Run Google Search with all queries at once
          const searchRun = await client.actor(googleSearchActor).call({
            queries: searchQueries,
            maxPagesPerQuery: 1,
            resultsPerPage: 5,
            languageCode: 'en',
            mobileResults: false
          });
          
          // Get search results
          const { items: searchResults } = await client.dataset(searchRun.defaultDatasetId).listItems();
          console.log(`  ✅ Got ${searchResults.length} search results`);
          
          // Process search results to extract Facebook URLs
          searchResults.forEach((result) => {
            const query = result.searchQuery?.term || '';
            const organicResults = result.organicResults || [];
            
            // Find which business this query belongs to
            const business = businessesNoEmailNoFB.find(b => 
              query.includes(b.name)
            );
            
            if (business) {
              // Find Facebook URL in search results
              for (const organic of organicResults) {
                const url = organic.url || '';
                if (url.includes('facebook.com') && !url.includes('/directory/')) {
                  business.facebookUrl = url;
                  foundFacebookUrls.push({ business, url });
                  console.log(`    ✓ Found Facebook for ${business.name}: ${url}`);
                  break;
                }
              }
            }
          });
          
          // Now enrich the newly found Facebook pages
          if (foundFacebookUrls.length > 0) {
            console.log(`  📘 Enriching ${foundFacebookUrls.length} newly found Facebook pages`);
            
            // Deduplicate Facebook URLs (some businesses may have found the same page)
            const uniqueUrlsMap = new Map();
            foundFacebookUrls.forEach(({ business, url }) => {
              const normalizedUrl = url.toLowerCase().split('?')[0].replace(/\/$/, '');
              if (!uniqueUrlsMap.has(normalizedUrl)) {
                uniqueUrlsMap.set(normalizedUrl, []);
              }
              uniqueUrlsMap.get(normalizedUrl).push(business);
            });
            
            const fbUrlsToEnrich = Array.from(uniqueUrlsMap.keys());
            console.log(`  📘 Deduped to ${fbUrlsToEnrich.length} unique Facebook pages`);
            
            // Run Facebook Pages Scraper
            const fbRun = await client.actor('4Hv5RhChiaDk6iwad').call({
              startUrls: fbUrlsToEnrich.map(url => ({ url })),
              maxPagesToScrap: 1,
              scrapeAbout: true,
              scrapeReviews: false,
              scrapePosts: false,
              scrapeServices: true,
              scrapeAdditionalInfo: true,
              scrapeDirectEmails: true,
              scrapeWebsiteEmails: true
            });
            
            // Get Facebook enrichment results
            const { items: fbItems } = await client.dataset(fbRun.defaultDatasetId).listItems();
            
            console.log(`  📊 Received ${fbItems.length} results from Facebook scraper`);
            
            // uniqueUrlsMap already contains the business mapping from above
            
            // Merge Facebook data back into businesses
            fbItems.forEach(fbItem => {
              // Get the URL from the Facebook result - try multiple fields
              const resultUrl = fbItem.url || fbItem.facebookUrl || fbItem.pageUrl || '';
              const normalizedResultUrl = resultUrl.toLowerCase().split('?')[0].replace(/\/$/, '');
              
              // Find all businesses for this Facebook page (could be multiple)
              const businesses = uniqueUrlsMap.get(normalizedResultUrl) || [];
              
              if (businesses.length > 0) {
                // Check for email in the simple "email" field (most common)
                let foundEmail = '';
                
                if (fbItem.email && fbItem.email.trim()) {
                  foundEmail = fbItem.email.trim();
                }
                
                // Apply email to all businesses that share this Facebook page
                businesses.forEach(business => {
                  if (foundEmail) {
                    business.email = foundEmail;
                    business.emailSource = 'facebook'; // Track that this came from Facebook
                    enrichmentStats.enrichedFromSearch++;
                    console.log(`    ✉️ Found email for ${business.name}: ${foundEmail}`);
                    
                    // Add Facebook data
                    business.facebookData = {
                      likes: fbItem.likes || 0,
                      email: foundEmail,
                      phone: fbItem.phone || '',
                      website: fbItem.website || fbItem.websites?.[0] || ''
                    };
                  } else {
                    console.log(`    ❌ No email found for ${business.name} on Facebook page`);
                  }
                });
              } else {
                console.log(`    ⚠️ Could not match Facebook result URL: ${normalizedResultUrl}`);
              }
            });
          }
        } catch (searchError) {
          console.error('  ⚠️ Facebook search failed:', searchError.message);
        }
      }
      
      // Calculate final statistics
      enrichmentStats.stillNoEmail = campaign.businesses.filter(b => !b.email).length;
      
      console.log('\n📊 Email Enrichment Results:');
      console.log(`  - Already had email: ${enrichmentStats.hasEmailFromGoogleMaps}`);
      console.log(`  - Enriched from Facebook: ${enrichmentStats.enrichedFromFacebook}`);
      console.log(`  - Enriched via search: ${enrichmentStats.enrichedFromSearch}`);
      console.log(`  - Still no email: ${enrichmentStats.stillNoEmail}`);
      console.log(`  - Total with email: ${campaign.businesses.filter(b => b.email).length}/${campaign.businesses.length}`);
      
      // Update campaign stats in Supabase
      const totalEmailsFound = campaign.businesses.filter(b => b.email).length;
      const actualCost = ((items.length * 0.007) + (facebookUrls.length * 0.003)).toFixed(2);
      
      try {
        await gmapsCampaigns.update(campaignId, {
          total_businesses_found: items.length,
          total_emails_found: totalEmailsFound,
          total_facebook_pages_found: facebookUrls.length,
          status: 'completed',
          completed_at: new Date().toISOString(),
          actual_cost: actualCost
        });
        
        // Save businesses to Supabase
        if (campaign.businesses.length > 0) {
          // Group businesses by ZIP code for saving
          const businessesByZip = {};
          campaign.businesses.forEach(business => {
            // Set email source if not already set
            if (!business.emailSource) {
              if (business.email && business.facebookData) {
                business.emailSource = 'facebook';
              } else if (business.email) {
                business.emailSource = 'google_maps';
              } else {
                business.emailSource = 'not_found';
              }
            }
            
            const zip = business.sourceZip || business.postalCode || business.zip || 'unknown';
            if (!businessesByZip[zip]) {
              businessesByZip[zip] = [];
            }
            businessesByZip[zip].push(business);
          });
          
          // Save each ZIP's businesses
          for (const [zipCode, zipBusinesses] of Object.entries(businessesByZip)) {
            if (zipBusinesses && zipBusinesses.length > 0) {
              const savedBusinesses = await gmapsBusinesses.saveBusinesses(campaignId, zipBusinesses, zipCode);
              
              // Save Facebook enrichment data for businesses that have it
              for (let i = 0; i < zipBusinesses.length; i++) {
                const business = zipBusinesses[i];
                const savedBusiness = savedBusinesses[i];
                
                if (business.facebookData && business.email && savedBusiness) {
                  try {
                    await gmapsBusinesses.saveFacebookEnrichment(savedBusiness.id, campaignId, {
                      facebookUrl: business.facebookUrl,
                      email: business.email,
                      emails: [business.email],
                      phoneNumbers: business.facebookData.phone ? [business.facebookData.phone] : [],
                      confidence: 0.8,
                      rawData: business.facebookData.rawData || business.facebookData
                    });
                  } catch (enrichErr) {
                    console.error(`Failed to save Facebook enrichment for ${business.name}:`, enrichErr.message);
                  }
                }
              }
            }
          }
        }
        
        console.log(`✅ Campaign completed and saved to Supabase: ${items.length} businesses, ${totalEmailsFound} emails`);
      } catch (error) {
        console.error('Error saving campaign results to Supabase:', error);
      }
      
    } catch (error) {
      console.error(`❌ Campaign ${campaignId} failed with error:`, error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        code: error.code
      });
      
      try {
        await gmapsCampaigns.update(campaignId, {
          status: 'failed',
          error: error.message,
          completed_at: new Date().toISOString()
        });
      } catch (updateError) {
        console.error('Error updating failed campaign status:', updateError);
      }
    }
  })().catch(uncaughtError => {
    console.error(`🔥 Uncaught error in campaign ${campaignId} async execution:`, uncaughtError);
    console.error('Stack:', uncaughtError.stack);
  });
});

app.get('/api/gmaps/campaigns/:campaignId', async (req, res) => {
  const { campaignId } = req.params;
  
  try {
    const campaign = await gmapsCampaigns.getById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json({
      campaign,
      analytics: {
        total_businesses: campaign.total_businesses_found,
        total_emails: campaign.total_emails_found,
        email_rate: campaign.total_businesses_found ? (campaign.total_emails_found / campaign.total_businesses_found * 100).toFixed(1) + '%' : '0%'
      },
      businesses: campaign.businesses || []
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

app.get('/api/gmaps/campaigns/:campaignId/export', async (req, res) => {
  const { campaignId } = req.params;
  
  try {
    const campaign = await gmapsCampaigns.getById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const exportData = await gmapsExport.getExportData(campaignId);
    if (!exportData || exportData.length === 0) {
      return res.status(400).json({ error: 'No businesses found in campaign' });
    }
  
  // Create CSV header
  const headers = [
    'Business Name',
    'Address', 
    'Phone',
    'Website',
    'Email',
    'LinkedIn URL',
    'Facebook URL',
    'Email Source',
    'Rating',
    'Reviews',
    'Category',
    'Address ZIP',
    'Source ZIP',
    'Neighborhood',
    'Search Query'
  ];
  
  // Create CSV rows
  const rows = exportData.map(business => {
    // Use the actual email source from database
    const emailSource = business.emailSource === 'google_maps' ? 'Google Maps' :
                       business.emailSource === 'facebook' ? 'Facebook' :
                       business.emailSource === 'website' ? 'Website' :
                       business.emailSource === 'manual' ? 'Manual' :
                       'Not Found';
    
    return [
      business.title || business.name || '',
      business.address || '',
      business.phone || '',
      business.website || '',
      business.email || '',
      business.linkedInUrl || business.linkedin || '',
      business.facebookUrl || business.facebook || '',
      emailSource,
      business.rating || '',
      business.reviews || '',
      business.categoryName || business.category || '',
      business.postalCode || business.postal_code || business.zip || '',
      business.sourceZip || '',
      business.sourceNeighborhood || '',
      business.sourceQuery || ''
    ].map(field => {
      // Escape fields that contain commas, quotes, or newlines
      const str = String(field);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  });
  
  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows].join('\n');
  
  // Add UTF-8 BOM for better Excel compatibility
  const bom = '\uFEFF';
  const csvWithBom = bom + csvContent;
  
  // Generate filename
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `gmaps-export-${campaign.name.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}.csv`;
  
    // Send CSV as download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvWithBom);
  } catch (error) {
    console.error('Error exporting campaign:', error);
    res.status(500).json({ error: 'Failed to export campaign data' });
  }
});

app.delete('/api/gmaps/campaigns/:campaignId', async (req, res) => {
  const { campaignId } = req.params;
  
  try {
    await gmapsCampaigns.delete(campaignId);
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: 'Campaign not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete campaign' });
    }
  }
});

app.listen(port, async () => {
  console.log(`Lead Generation API Server running at http://localhost:${port}`);
  console.log('Python executable:', pythonCmd);
  
  // Initialize Supabase schema
  try {
    await initializeSchema();
    console.log('✅ Supabase connection initialized');
  } catch (error) {
    console.error('⚠️ Supabase initialization warning:', error.message);
  }
  console.log('Available endpoints:');
  console.log('- GET  / (health check)');
  console.log('- GET  /api-keys');  
  console.log('- POST /api-keys');
  console.log('- GET  /settings');
  console.log('- POST /settings'); 
  console.log('- GET  /prompts');
  console.log('- POST /prompts');
  console.log('- GET  /supabase');
  console.log('- POST /supabase');
  console.log('- POST /test-connection');
  console.log('- POST /test-supabase');
  console.log('- POST /generate-icebreaker');
  console.log('- GET  /sample-data');
  console.log('- GET  /export-icebreakers');
  console.log('- GET  /organizations');
  console.log('- POST /organizations');
  console.log('- GET  /organizations/:id');
  console.log('- PUT  /organizations/:id');
  console.log('- DELETE /organizations/:id');
  console.log('- POST /set-organization');
  console.log('- GET  /current-organization');
  console.log('- GET  /organizations/:id/api-keys');
  console.log('- POST /organizations/:id/api-keys');
  console.log('- GET  /organizations/:id/settings');
  console.log('- POST /organizations/:id/settings');
  console.log('- GET  /organizations/:id/usage');
  console.log('- GET  /audiences');
  console.log('- POST /audiences');
  console.log('- PUT  /audiences/:id');
  console.log('- DELETE /audiences/:id');
  console.log('- GET  /audiences/:id/urls');
  console.log('- POST /audiences/:id/urls');
  console.log('- DELETE /audiences/:audienceId/urls/:urlId');
  console.log('- POST /audiences/:id/scrape');
  console.log('- GET  /campaigns');
  console.log('- POST /campaigns');
  console.log('- PUT  /campaigns/:id');
  console.log('- DELETE /campaigns/:id');
  console.log('- GET  /campaigns/:id/urls');
  console.log('- POST /campaigns/:id/urls');
  console.log('- DELETE /campaigns/:campaignId/urls/:urlId');
  console.log('- POST /run-script');
  console.log('- GET  /script-status');
  console.log('- POST /stop-script');
  console.log('- GET  /script-logs');
  console.log('- GET  /execution-history');
});