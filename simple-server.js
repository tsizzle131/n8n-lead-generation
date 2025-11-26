const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { ApifyClient } = require('apify-client');
const { supabase, gmapsCampaigns, gmapsCoverage, gmapsBusinesses, gmapsExport, instantlyEvents, organizations, initializeSchema } = require('./supabase-db');

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

// Security: Restrict CORS to known origins
const allowedOrigins = ['http://localhost:3000', 'http://localhost:5001'];
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

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

  // Always check environment variables for Supabase (takes precedence for production)
  if (process.env.SUPABASE_URL) {
    if (!appState.supabase) appState.supabase = {};
    appState.supabase.url = process.env.SUPABASE_URL;
    console.log('Using SUPABASE_URL from environment');
  }
  if (process.env.SUPABASE_KEY) {
    if (!appState.supabase) appState.supabase = {};
    appState.supabase.key = process.env.SUPABASE_KEY;
    console.log('Using SUPABASE_KEY from environment');
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
  const { openai_api_key, apify_api_key, bouncer_api_key, vapi_api_key, instantly_api_key, linkedin_actor_id } = req.body;

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

  if (bouncer_api_key && !bouncer_api_key.includes('*')) {
    appState.apiKeys.bouncer_api_key = bouncer_api_key;
    console.log('Bouncer API key updated with real key');
  } else if (bouncer_api_key && bouncer_api_key.includes('*')) {
    console.log('Ignoring masked Bouncer API key - keeping existing real key');
  }

  if (vapi_api_key && !vapi_api_key.includes('*')) {
    appState.apiKeys.vapi_api_key = vapi_api_key;
    console.log('VAPI API key updated with real key');
  } else if (vapi_api_key && vapi_api_key.includes('*')) {
    console.log('Ignoring masked VAPI API key - keeping existing real key');
  }

  if (instantly_api_key && !instantly_api_key.includes('*')) {
    appState.apiKeys.instantly_api_key = instantly_api_key;
    console.log('Instantly.ai API key updated with real key');
  } else if (instantly_api_key && instantly_api_key.includes('*')) {
    console.log('Ignoring masked Instantly.ai API key - keeping existing real key');
  }

  // LinkedIn actor ID is not sensitive, just save it
  if (linkedin_actor_id !== undefined) {
    appState.settings.linkedin_actor_id = linkedin_actor_id;
    console.log('LinkedIn actor ID updated:', linkedin_actor_id);
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

// Test Bouncer API connection
app.post('/api/settings/test-bouncer', async (req, res) => {
  const bouncerKey = appState.apiKeys.bouncer_api_key;
  console.log('Testing Bouncer API with key:', bouncerKey ? `${bouncerKey.substring(0, 10)}...` : 'NOT SET');

  if (!bouncerKey) {
    return res.status(400).json({ status: 'error', message: 'Bouncer API key not configured' });
  }

  try {
    // Test Bouncer API with a simple email verification
    const testEmail = 'test@example.com'; // Use a known test email
    const response = await fetch(`https://api.usebouncer.com/v1.1/email/verify?email=${testEmail}`, {
      method: 'GET',
      headers: {
        'x-api-key': bouncerKey
      }
    });

    const data = await response.json();

    if (response.ok) {
      // Bouncer returns 200 OK with verification results
      res.json({
        status: 'success',
        message: 'Bouncer API connection successful',
        credits_remaining: data.credits || 'Unknown',
        test_result: {
          email: testEmail,
          status: data.status,
          reason: data.reason
        }
      });
    } else if (response.status === 401) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid Bouncer API key. Please check your key and try again.'
      });
    } else if (response.status === 402) {
      res.status(402).json({
        status: 'error',
        message: 'Insufficient credits. Please add credits to your Bouncer account.'
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: `Bouncer API error: ${data.message || response.statusText}`
      });
    }

  } catch (err) {
    console.log('Bouncer test exception:', err);
    res.status(500).json({
      status: 'error',
      message: 'Bouncer connection test error: ' + err.message
    });
  }
});

// Rate limiting middleware for icebreaker endpoint
const icebreakerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many icebreaker requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation middleware for icebreaker endpoint
const validateIcebreakerRequest = [
  body('contact').isObject().withMessage('Contact must be an object'),
  body('contact.email').isEmail().withMessage('Valid email is required'),
  body('contact.name').optional().isString().withMessage('Name must be a string'),
  body('custom_prompts').optional().isObject().withMessage('Custom prompts must be an object'),
];

app.post('/generate-icebreaker',
  icebreakerLimiter,
  validateIcebreakerRequest,
  async (req, res) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { contact, custom_prompts } = req.body;
  const openaiKey = appState.apiKeys.openai_api_key;

  if (!openaiKey) {
    return res.status(400).json({ error: 'OpenAI API key not configured' });
  }

  try {
    // Fetch organization data for personalized icebreakers
    let organizationData = null;
    if (appState.currentOrganization) {
      try {
        const { data, error} = await supabase
          .from('organizations')
          .select('name, product_name, product_description, value_proposition, target_audience, messaging_tone, industry')
          .eq('id', appState.currentOrganization)
          .single();

        if (!error && data) {
          organizationData = data;
        }
      } catch (err) {
        console.log('Could not fetch organization data:', err.message);
      }
    }

    // Call Python script to generate icebreaker
    const python = spawn(pythonCmd, [
      path.join(__dirname, 'generate_icebreaker.py'),
      openaiKey,
      JSON.stringify(contact),
      JSON.stringify(custom_prompts || appState.prompts),
      JSON.stringify(appState.settings),
      JSON.stringify(organizationData || {})
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
        const response = await fetch(`${cleanUrl}/rest/v1/organizations?id=eq.${currentOrgId}`, {
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
      `${cleanUrl}/rest/v1/organizations?id=eq.${id}&select=company_mission,core_values,company_story,product_url_deprecated,product_name_deprecated,product_description_deprecated,value_proposition_deprecated,target_audience_deprecated,industry_deprecated,product_features_deprecated,product_examples_deprecated,messaging_tone_deprecated,product_analyzed_at_deprecated,custom_icebreaker_prompt_deprecated`,
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

    // Map deprecated column names to non-deprecated names for frontend compatibility
    const org = organizations[0];
    const config = {
      company_mission: org.company_mission,
      core_values: org.core_values,
      company_story: org.company_story,
      product_url: org.product_url_deprecated,
      product_name: org.product_name_deprecated,
      product_description: org.product_description_deprecated,
      value_proposition: org.value_proposition_deprecated,
      target_audience: org.target_audience_deprecated,
      industry: org.industry_deprecated,
      product_features: org.product_features_deprecated,
      product_examples: org.product_examples_deprecated,
      messaging_tone: org.messaging_tone_deprecated,
      product_analyzed_at: org.product_analyzed_at_deprecated,
      custom_icebreaker_prompt: org.custom_icebreaker_prompt_deprecated
    };

    res.json(config);
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
      // Build company context section
      let companyContext = '';
      if (productConfig.company_mission) {
        companyContext += `- Mission: ${productConfig.company_mission}\n`;
      }
      if (productConfig.core_values && productConfig.core_values.length > 0) {
        companyContext += `- Core Values: ${productConfig.core_values.join(', ')}\n`;
      }
      if (productConfig.company_story) {
        companyContext += `- Our Story: ${productConfig.company_story}\n`;
      }

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

**Your Company Context:**
${companyContext || '- Focus on delivering value\n'}

**Your Job:**
Write 2-3 sentences that:
1. Reference ONE specific thing about their business
2. Connect it to how ${productConfig.product_name} could help
3. Sound human and conversational
4. Reflect your company's mission and values in your approach

**Tone:** ${productConfig.messaging_tone || 'professional'}

Return format:
{{"icebreaker": "your message"}}`;

      productConfig.custom_icebreaker_prompt = customPrompt;
    }

    // Map non-deprecated names to deprecated column names for database compatibility
    const dbConfig = {
      company_mission: productConfig.company_mission,
      core_values: productConfig.core_values,
      company_story: productConfig.company_story,
      product_url_deprecated: productConfig.product_url,
      product_name_deprecated: productConfig.product_name,
      product_description_deprecated: productConfig.product_description,
      value_proposition_deprecated: productConfig.value_proposition,
      target_audience_deprecated: productConfig.target_audience,
      industry_deprecated: productConfig.industry,
      product_features_deprecated: productConfig.product_features,
      product_examples_deprecated: productConfig.product_examples,
      messaging_tone_deprecated: productConfig.messaging_tone,
      product_analyzed_at_deprecated: productConfig.product_analyzed_at,
      custom_icebreaker_prompt_deprecated: productConfig.custom_icebreaker_prompt
    };

    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/organizations?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(dbConfig)
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

// ============================================================================
// Products Management Endpoints
// ============================================================================

// List all products for an organization
app.get('/organizations/:id/products', async (req, res) => {
  const { id } = req.params;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(
      `${cleanUrl}/rest/v1/products?organization_id=eq.${id}&order=display_order.asc,created_at.desc`,
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

    const products = await response.json();
    res.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single product by ID
app.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(
      `${cleanUrl}/rest/v1/products?id=eq.${id}`,
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

    const products = await response.json();
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(products[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new product
app.post('/organizations/:id/products', async (req, res) => {
  const { id } = req.params;
  const productData = req.body;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  // Validate required fields
  if (!productData.name || productData.name.trim().length === 0) {
    return res.status(400).json({ error: 'Product name is required' });
  }

  try {
    // Generate slug from name if not provided
    const slug = productData.slug || productData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Build custom icebreaker prompt if we have enough data
    let customPrompt = null;
    if (productData.name && productData.value_proposition) {
      customPrompt = `You're writing the opening lines of a cold email for ${productData.name}.

**The Person:**
Name: {first_name} {last_name}
Role: {headline}
Company: {company_name}
Location: {location}

**What you learned about their company:**
{website_summaries}

**Your Product/Service:**
- Name: ${productData.name}
- Description: ${productData.description || 'Product/service'}
- Value: ${productData.value_proposition}
- Target: ${productData.target_audience || 'Businesses'}

**Your Job:**
Write 2-3 sentences that:
1. Reference ONE specific thing about their business
2. Connect it to how ${productData.name} could help
3. Sound human and conversational

**Tone:** ${productData.messaging_tone || 'professional'}

Return format:
{{"icebreaker": "your message"}}`;
    }

    const newProduct = {
      organization_id: id,
      name: productData.name,
      slug: slug,
      description: productData.description || null,
      product_url: productData.product_url || null,
      value_proposition: productData.value_proposition || null,
      target_audience: productData.target_audience || null,
      industry: productData.industry || null,
      messaging_tone: productData.messaging_tone || 'professional',
      product_features: productData.product_features || [],
      product_examples: productData.product_examples || [],
      custom_icebreaker_prompt: customPrompt,
      target_categories: productData.target_categories || [],
      category_matching_keywords: productData.category_matching_keywords || [],
      is_active: productData.is_active !== undefined ? productData.is_active : true,
      is_default: productData.is_default || false,
      display_order: productData.display_order || 0
    };

    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const response = await fetch(`${cleanUrl}/rest/v1/products`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(newProduct)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const created = await response.json();

    // If this is set as default, update the organization
    if (productData.is_default && created.length > 0) {
      await fetch(`${cleanUrl}/rest/v1/organizations?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ default_product_id: created[0].id })
      });
    }

    res.status(201).json({
      message: 'Product created successfully',
      product: created[0]
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a product
app.put('/products/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    // First, get the existing product to get organization_id
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const getResponse = await fetch(
      `${cleanUrl}/rest/v1/products?id=eq.${id}`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!getResponse.ok) {
      throw new Error(`HTTP ${getResponse.status}: ${await getResponse.text()}`);
    }

    const existing = await getResponse.json();
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const existingProduct = existing[0];

    // Rebuild custom icebreaker prompt if relevant fields changed
    if (updates.name || updates.value_proposition || updates.description ||
        updates.target_audience || updates.messaging_tone) {

      const name = updates.name || existingProduct.name;
      const valueProp = updates.value_proposition || existingProduct.value_proposition;
      const description = updates.description || existingProduct.description;
      const targetAudience = updates.target_audience || existingProduct.target_audience;
      const tone = updates.messaging_tone || existingProduct.messaging_tone;

      if (name && valueProp) {
        updates.custom_icebreaker_prompt = `You're writing the opening lines of a cold email for ${name}.

**The Person:**
Name: {first_name} {last_name}
Role: {headline}
Company: {company_name}
Location: {location}

**What you learned about their company:**
{website_summaries}

**Your Product/Service:**
- Name: ${name}
- Description: ${description || 'Product/service'}
- Value: ${valueProp}
- Target: ${targetAudience || 'Businesses'}

**Your Job:**
Write 2-3 sentences that:
1. Reference ONE specific thing about their business
2. Connect it to how ${name} could help
3. Sound human and conversational

**Tone:** ${tone || 'professional'}

Return format:
{{"icebreaker": "your message"}}`;
      }
    }

    // Update timestamp
    updates.updated_at = new Date().toISOString();

    const response = await fetch(`${cleanUrl}/rest/v1/products?id=eq.${id}`, {
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

    const updated = await response.json();

    // If is_default was set to true, update the organization
    if (updates.is_default === true && updated.length > 0) {
      await fetch(`${cleanUrl}/rest/v1/organizations?id=eq.${existingProduct.organization_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ default_product_id: updated[0].id })
      });
    }

    res.json({
      message: 'Product updated successfully',
      product: updated[0]
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a product
app.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    // First, get the product to check if it's the default
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const getResponse = await fetch(
      `${cleanUrl}/rest/v1/products?id=eq.${id}`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!getResponse.ok) {
      throw new Error(`HTTP ${getResponse.status}: ${await getResponse.text()}`);
    }

    const products = await getResponse.json();
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = products[0];

    // Check if this is the default product for the organization
    const orgResponse = await fetch(
      `${cleanUrl}/rest/v1/organizations?id=eq.${product.organization_id}&select=default_product_id`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (orgResponse.ok) {
      const orgs = await orgResponse.json();
      if (orgs.length > 0 && orgs[0].default_product_id === id) {
        // Clear the default product reference before deleting
        await fetch(`${cleanUrl}/rest/v1/organizations?id=eq.${product.organization_id}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ default_product_id: null })
        });

        // Invalidate organization cache so next fetch gets fresh data
        if (appState.organizations && appState.organizations[product.organization_id]) {
          delete appState.organizations[product.organization_id];
        }
      }
    }

    // Delete the product
    const response = await fetch(`${cleanUrl}/rest/v1/products?id=eq.${id}`, {
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

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set a product as the default for its organization
app.put('/products/:id/set-default', async (req, res) => {
  const { id } = req.params;
  const supabaseUrl = appState.supabase?.url;
  const supabaseKey = appState.supabase?.key;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(400).json({ error: 'Supabase not configured' });
  }

  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');

    // Get the product to find its organization
    const getResponse = await fetch(
      `${cleanUrl}/rest/v1/products?id=eq.${id}`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!getResponse.ok) {
      throw new Error(`HTTP ${getResponse.status}: ${await getResponse.text()}`);
    }

    const products = await getResponse.json();
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = products[0];
    const organizationId = product.organization_id;

    // Update all products in this organization to not be default
    await fetch(`${cleanUrl}/rest/v1/products?organization_id=eq.${organizationId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ is_default: false })
    });

    // Set this product as default
    const updateResponse = await fetch(`${cleanUrl}/rest/v1/products?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ is_default: true })
    });

    if (!updateResponse.ok) {
      throw new Error(`HTTP ${updateResponse.status}: ${await updateResponse.text()}`);
    }

    const updated = await updateResponse.json();

    // Update the organization's default_product_id
    await fetch(`${cleanUrl}/rest/v1/organizations?id=eq.${organizationId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ default_product_id: id })
    });

    // Invalidate organization cache so next fetch gets fresh data
    if (appState.organizations && appState.organizations[organizationId]) {
      delete appState.organizations[organizationId];
    }

    res.json({
      message: 'Product set as default successfully',
      product: updated[0]
    });
  } catch (error) {
    console.error('Error setting default product:', error);
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
    // Filter campaigns by current organization
    const organizationId = appState.currentOrganization;
    const campaigns = await gmapsCampaigns.getAll(organizationId);
    console.log(`  ✅ Found ${campaigns.length} campaigns for organization: ${organizationId}`);
    res.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

app.post('/api/gmaps/campaigns/create', async (req, res) => {
  const { name, location, keywords, coverage_profile = 'balanced', description, product_id } = req.body;

  console.log('📍 Creating Google Maps campaign:', { name, location, keywords, product_id });

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
          const pythonProcess = spawn(pythonCmd, [
            path.join(__dirname, 'scripts', 'maintenance', 'analyze_zip_codes.py')
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
  
  // Validate organization is selected
  if (!appState.currentOrganization) {
    return res.status(400).json({
      error: 'No organization selected',
      message: 'Please select an organization before creating a campaign'
    });
  }

  // Handle product_id - use provided or get default
  let finalProductId = product_id;
  if (!finalProductId) {
    try {
      const { products } = require('./supabase-db');
      const defaultProduct = await products.getDefaultForOrg(appState.currentOrganization);
      if (defaultProduct) {
        finalProductId = defaultProduct.id;
        console.log(`📦 Using default product: ${defaultProduct.name}`);
      } else {
        console.warn('⚠️  No default product found for organization');
      }
    } catch (error) {
      console.warn('Could not fetch default product:', error.message);
    }
  }

  const campaignData = {
    name,
    location,
    keywords: keywordsArray,
    coverage_profile,
    description,
    status: 'draft',
    organization_id: appState.currentOrganization,  // FIX: Add organization_id
    product_id: finalProductId,  // NEW: Add product_id
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

  // Get OpenAI API key (required for Python campaign manager)
  const openaiKey = appState.apiKeys.openai_api_key;
  if (!openaiKey) {
    return res.status(400).json({ error: 'OpenAI API key not configured' });
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

  // Check if we should use Python campaign manager (with LinkedIn + Bouncer integration)
  const usePythonManager = appState.settings.use_python_campaign_manager || false;

  if (usePythonManager) {
    // ============================================
    // NEW: USE PYTHON CAMPAIGN MANAGER
    // Includes LinkedIn enrichment and Bouncer email verification
    // ============================================
    console.log('🐍 Using Python Campaign Manager (with LinkedIn + Bouncer)');
    (async () => {
      // Add timeout to prevent campaigns from running indefinitely (4 hours = 14400000ms)
      const executionTimeout = setTimeout(async () => {
        console.error(`⏰ Campaign ${campaignId} execution timeout after 4 hours`);
        try {
          await gmapsCampaigns.update(campaignId, {
            status: 'failed',
            error: 'Execution timeout after 4 hours',
            completed_at: new Date().toISOString()
          });
          console.log(`✅ Updated campaign ${campaignId} status to failed due to timeout`);
        } catch (e) {
          console.error('Failed to update timeout status:', e);
        }
      }, 14400000); // 4 hours

      try {
        const { spawn } = require('child_process');
        const path = require('path');

        const executePythonCampaign = () => {
          return new Promise((resolve, reject) => {
            const pythonProcess = spawn(pythonCmd, [
              path.join(__dirname, 'scripts', 'maintenance', 'execute_gmaps_campaign.py')
            ]);

            // Prepare input data
            const input = JSON.stringify({
              campaign_id: campaignId,
              supabase_url: appState.supabase.url,
              supabase_key: appState.supabase.key,
              apify_api_key: apifyKey,
              openai_api_key: openaiKey,
              bouncer_api_key: appState.apiKeys.bouncer_api_key || '',
              linkedin_actor_id: appState.apiKeys.linkedin_actor_id || appState.settings.linkedin_actor_id || 'bebity~linkedin-premium-actor',
              max_businesses_per_zip: max_businesses_per_zip
            });

            let output = '';
            let error = '';

            pythonProcess.stdout.on('data', (data) => {
              const chunk = data.toString();
              output += chunk;
              console.log(chunk); // Stream output to console
            });

            pythonProcess.stderr.on('data', (data) => {
              const chunk = data.toString();
              error += chunk;
              console.error(chunk); // Stream errors to console
            });

            pythonProcess.on('close', (code) => {
              if (code !== 0) {
                reject(new Error(`Campaign execution failed: ${error}`));
              } else {
                try {
                  const result = JSON.parse(output);
                  resolve(result);
                } catch (e) {
                  reject(new Error(`Failed to parse campaign result: ${e.message}`));
                }
              }
            });

            // Send input data to Python script
            pythonProcess.stdin.write(input);
            pythonProcess.stdin.end();
          });
        };

        console.log(`🚀 Starting Python campaign execution for ${campaignId}`);
        const result = await executePythonCampaign();

        if (result.error) {
          console.error('❌ Campaign failed:', result.error);
          clearTimeout(executionTimeout); // Clear timeout on failure
          await gmapsCampaigns.update(campaignId, {
            status: 'failed',
            completed_at: new Date().toISOString()
          });
        } else {
          console.log('✅ Campaign completed successfully');
          console.log('📊 Results:', JSON.stringify(result, null, 2));
          clearTimeout(executionTimeout); // Clear timeout on success

          // Fallback status update in case Python didn't update it
          // Only update if campaign is still in "running" status
          try {
            const campaign = await gmapsCampaigns.get(campaignId);
            if (campaign && campaign.status === 'running') {
              await gmapsCampaigns.update(campaignId, {
                status: 'completed',
                completed_at: new Date().toISOString()
              });
              console.log('✅ Updated campaign status to completed (fallback)');
            }
          } catch (fallbackError) {
            console.error('Error in fallback status update:', fallbackError);
          }
        }

      } catch (error) {
        console.error('Error executing Python campaign:', error);
        clearTimeout(executionTimeout); // Clear timeout on exception
        await gmapsCampaigns.update(campaignId, {
          status: 'failed',
          completed_at: new Date().toISOString()
        });
      }
    })();
  } else {
    // ============================================
    // LEGACY: JAVASCRIPT CAMPAIGN EXECUTION
    // Original implementation without LinkedIn/Bouncer
    // ============================================
    console.log('📍 Using legacy JavaScript campaign execution');

  // Run Apify scraper asynchronously
  (async () => {
    // Add timeout to prevent campaigns from running indefinitely (4 hours = 14400000ms)
    const executionTimeout = setTimeout(async () => {
      console.error(`⏰ Campaign ${campaignId} execution timeout after 4 hours`);
      try {
        await gmapsCampaigns.update(campaignId, {
          status: 'failed',
          error: 'Execution timeout after 4 hours',
          completed_at: new Date().toISOString()
        });
        console.log(`✅ Updated campaign ${campaignId} status to failed due to timeout`);
      } catch (e) {
        console.error('Failed to update timeout status:', e);
      }
    }, 14400000); // 4 hours

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
                path.join(__dirname, 'scripts', 'maintenance', 'analyze_zip_codes.py')
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

      clearTimeout(executionTimeout); // Clear timeout on successful completion

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

      clearTimeout(executionTimeout); // Clear timeout on error

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
  })().catch(async (uncaughtError) => {
    console.error(`🔥 Uncaught error in campaign ${campaignId} async execution:`, uncaughtError);
    console.error('Stack:', uncaughtError.stack);

    // Update campaign status to failed
    try {
      await gmapsCampaigns.update(campaignId, {
        status: 'failed',
        error: uncaughtError.message || 'Uncaught execution error',
        completed_at: new Date().toISOString()
      });
      console.log(`✅ Updated campaign ${campaignId} status to failed`);
    } catch (updateError) {
      console.error('Failed to update campaign status after uncaught error:', updateError);
    }
  });
  } // End of else block (legacy JavaScript execution)
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
    
    // Use the new paginated export function to get ALL data
    const exportData = await gmapsExport.getFullExportData(campaignId);
    if (!exportData || exportData.length === 0) {
      return res.status(400).json({ error: 'No businesses found in campaign' });
    }

    console.log(`Exporting ${exportData.length} businesses for campaign ${campaign.name}`);
  
  // Create CSV header
  const headers = [
    'Business Name',
    'Address',
    'Phone',
    'Website',
    'Email',
    'Icebreaker',
    'Subject Line',
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
      business.icebreaker || '',
      business.subjectLine || '',
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

// Export campaign to Instantly.ai
app.post('/api/gmaps/campaigns/:campaignId/export-to-instantly', async (req, res) => {
  const { campaignId } = req.params;
  const {
    campaignName,
    timezone = 'America/Chicago',
    hoursFrom = '09:00',
    hoursTo = '17:00'
  } = req.body;

  try {
    console.log(`📤 Exporting campaign ${campaignId} to Instantly.ai`);

    // Get Instantly API key
    const instantlyApiKey = appState.apiKeys?.instantly_api_key;
    if (!instantlyApiKey) {
      return res.status(400).json({
        error: 'Instantly.ai API key not configured. Please add it in Settings.'
      });
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: 'Supabase credentials not configured'
      });
    }

    // Get campaign info for naming
    const campaign = await gmapsCampaigns.getById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const finalCampaignName = campaignName || `${campaign.name} - ${new Date().toISOString().split('T')[0]}`;

    // Call Python export script
    const scriptPath = path.join(__dirname, 'lead_generation', 'scripts', 'export_to_instantly.py');
    const args = [
      scriptPath,
      '--campaign-id', campaignId,
      '--campaign-name', finalCampaignName,
      '--timezone', timezone,
      '--hours-from', hoursFrom,
      '--hours-to', hoursTo,
      '--api-key', instantlyApiKey,
      '--supabase-url', supabaseUrl,
      '--supabase-key', supabaseKey,
      '--organization-id', appState.currentOrganization || ''
    ];

    const exportPromise = new Promise((resolve, reject) => {
      const process = spawn(pythonCmd, ['-B', ...args]);
      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        console.log(chunk);
      });

      process.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        console.error(chunk);
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output.trim().split('\n').pop());
            resolve(result);
          } catch (e) {
            reject(new Error(`Failed to parse export result: ${e.message}`));
          }
        } else {
          reject(new Error(errorOutput || 'Export failed'));
        }
      });

      process.on('error', (err) => {
        reject(new Error(`Failed to start export process: ${err.message}`));
      });
    });

    // Set timeout for export (5 minutes)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Export timeout after 5 minutes')), 300000);
    });

    const result = await Promise.race([exportPromise, timeoutPromise]);

    if (result.success) {
      console.log('✅ Export complete:', result);
      res.json({
        success: true,
        campaign_id: result.campaign_id,
        campaign_name: result.campaign_name,
        campaign_url: result.campaign_url,
        leads_exported: result.leads_exported,
        total_businesses: result.total_businesses
      });
    } else {
      console.error('❌ Export failed:', result.error);
      res.status(500).json({
        error: result.error || 'Export failed'
      });
    }

  } catch (error) {
    console.error('Error exporting to Instantly:', error);
    res.status(500).json({
      error: error.message || 'Export failed'
    });
  }
});

// ============================================================================
// MASTER LEADS API (Internal Team Only)
// ============================================================================
// Aggregates all businesses across all organizations into deduplicated view

const { masterLeads } = require('./supabase-db');

// GET /api/master-leads - List leads with filters (including demographics)
app.get('/api/master-leads', async (req, res) => {
  try {
    const filters = {
      // Core filters
      category: req.query.category,
      city: req.query.city,
      state: req.query.state,
      postalCode: req.query.postal_code,
      hasEmail: req.query.has_email === 'true',
      verified: req.query.verified === 'true',
      // Demographic filters (requires enhanced master_leads view)
      minIncome: req.query.min_income ? parseInt(req.query.min_income) : null,
      minMarketScore: req.query.min_market_score ? parseFloat(req.query.min_market_score) : null,
      qualityTier: req.query.quality_tier,  // A, B, C, D
      leadPriority: req.query.lead_priority  // Hot, Warm, Standard, Cold
    };
    const options = {
      page: parseInt(req.query.page) || 0,
      pageSize: parseInt(req.query.page_size) || 100
    };
    const result = await masterLeads.getAll(filters, options);
    res.json(result);
  } catch (error) {
    console.error('Error fetching master leads:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/master-leads/stats - Statistics dashboard
app.get('/api/master-leads/stats', async (req, res) => {
  try {
    const stats = await masterLeads.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/master-leads/refresh - Trigger view refresh
app.post('/api/master-leads/refresh', async (req, res) => {
  try {
    await masterLeads.refresh();
    res.json({ success: true, message: 'Master leads view refreshed' });
  } catch (error) {
    console.error('Error refreshing:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/master-leads/search - Search by name
app.get('/api/master-leads/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Query parameter q is required' });
    const results = await masterLeads.search(query);
    res.json(results);
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/master-leads/export - Export for monthly reports
app.get('/api/master-leads/export', async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      state: req.query.state,
      hasEmail: req.query.has_email === 'true'
    };
    const data = await masterLeads.exportAll(filters);
    res.json({ data, total: data.length });
  } catch (error) {
    console.error('Error exporting:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ZIP Demographics Endpoints
// ============================================================================
const { zipDemographics } = require('./supabase-db');

// NOTE: Specific routes must come BEFORE the :zipCode catch-all route

// GET /api/demographics/search - Search demographics with filters
app.get('/api/demographics/search', async (req, res) => {
  try {
    const filters = {
      state: req.query.state,
      city: req.query.city,
      minIncome: req.query.min_income ? parseInt(req.query.min_income) : null,
      maxIncome: req.query.max_income ? parseInt(req.query.max_income) : null,
      minScore: req.query.min_score ? parseFloat(req.query.min_score) : null,
      tier: req.query.tier,
      minPopulation: req.query.min_population ? parseInt(req.query.min_population) : null
    };
    const options = {
      page: parseInt(req.query.page) || 0,
      pageSize: Math.min(parseInt(req.query.page_size) || 50, 250)
    };
    const result = await zipDemographics.search(filters, options);
    res.json(result);
  } catch (error) {
    console.error('Error searching demographics:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/demographics/opportunities - Get top market opportunities
app.get('/api/demographics/opportunities', async (req, res) => {
  try {
    const state = req.query.state || null;
    const limit = Math.min(parseInt(req.query.limit) || 50, 250);
    const data = await zipDemographics.getTopOpportunities(state, limit);
    res.json({ data, total: data.length });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/demographics/stats - Get overall demographics statistics
app.get('/api/demographics/stats', async (req, res) => {
  try {
    const stats = await zipDemographics.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching demographics stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/demographics/states - Get state-level summary
app.get('/api/demographics/states', async (req, res) => {
  try {
    const data = await zipDemographics.getStateSummary();
    res.json({ data, total: data.length });
  } catch (error) {
    console.error('Error fetching state summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/demographics/tier/:tier - Get ZIP codes by quality tier
app.get('/api/demographics/tier/:tier', async (req, res) => {
  try {
    const { tier } = req.params;
    if (!['A', 'B', 'C', 'D'].includes(tier.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid tier. Must be A, B, C, or D.' });
    }
    const state = req.query.state || null;
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const data = await zipDemographics.getByTier(tier.toUpperCase(), state, limit);
    res.json({ data, total: data.length });
  } catch (error) {
    console.error('Error fetching tier data:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/demographics/sync - Sync business metrics from master_leads
app.post('/api/demographics/sync', async (req, res) => {
  try {
    await zipDemographics.syncBusinessMetrics();
    res.json({ success: true, message: 'Business metrics synced and scores recalculated' });
  } catch (error) {
    console.error('Error syncing business metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/demographics/calculate-scores - Recalculate market scores
app.post('/api/demographics/calculate-scores', async (req, res) => {
  try {
    await zipDemographics.calculateScores();
    res.json({ success: true, message: 'Market opportunity scores recalculated' });
  } catch (error) {
    console.error('Error calculating scores:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/demographics/bulk - Get demographics for multiple ZIP codes
app.post('/api/demographics/bulk', async (req, res) => {
  try {
    const { zip_codes } = req.body;
    if (!Array.isArray(zip_codes) || zip_codes.length === 0) {
      return res.status(400).json({ error: 'zip_codes array is required' });
    }
    if (zip_codes.length > 500) {
      return res.status(400).json({ error: 'Maximum 500 ZIP codes per request' });
    }
    const data = await zipDemographics.getMultiple(zip_codes);
    res.json({ data, total: data.length, requested: zip_codes.length });
  } catch (error) {
    console.error('Error fetching bulk demographics:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/demographics/:zipCode - Get demographics for a single ZIP code
// NOTE: This MUST be last since :zipCode is a catch-all parameter
app.get('/api/demographics/:zipCode', async (req, res) => {
  try {
    const { zipCode } = req.params;
    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      return res.status(400).json({ error: 'Invalid ZIP code format. Must be 5 digits.' });
    }
    const data = await zipDemographics.getByZip(zipCode);
    if (!data) {
      return res.status(404).json({ error: `ZIP code ${zipCode} not found` });
    }
    res.json(data);
  } catch (error) {
    console.error('Error fetching ZIP demographics:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// INSTANTLY WEBHOOK ENDPOINTS
// =============================================================================

const crypto = require('crypto');

// POST /api/webhooks/instantly/:orgId - Receive Instantly webhook events
// This is the main webhook endpoint that Instantly will call for each event
app.post('/api/webhooks/instantly/:orgId', async (req, res) => {
  const { orgId } = req.params;
  const event = req.body;

  console.log(`📨 Instantly webhook received for org ${orgId}:`, event.event_type || 'unknown');

  try {
    // Validate organization exists
    const org = await organizations.getById(orgId);
    if (!org) {
      console.error(`❌ Webhook received for unknown organization: ${orgId}`);
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Map Instantly event types to our event types
    const eventTypeMap = {
      'email_opened': 'email_opened',
      'reply_received': 'reply_received',
      'link_clicked': 'link_clicked',
      'email_bounced': 'email_bounced',
      'lead_unsubscribed': 'lead_unsubscribed',
      // Alternative event names from Instantly
      'opened': 'email_opened',
      'replied': 'reply_received',
      'clicked': 'link_clicked',
      'bounced': 'email_bounced',
      'unsubscribed': 'lead_unsubscribed'
    };

    const eventType = eventTypeMap[event.event_type] || event.event_type;
    if (!eventType) {
      console.warn(`⚠️ Unknown event type: ${event.event_type}`);
      return res.status(400).json({ error: 'Unknown event type' });
    }

    // Extract lead email from various payload formats
    const leadEmail = event.lead_email || event.email || event.to_email || event.recipient;
    if (!leadEmail) {
      console.warn(`⚠️ No lead email in event payload`);
      return res.status(400).json({ error: 'Missing lead email' });
    }

    // Create event hash for deduplication
    const timestamp = event.timestamp || event.event_timestamp || new Date().toISOString();
    const hashInput = `${orgId}|${eventType}|${timestamp}|${leadEmail}`;
    const eventHash = crypto.createHash('md5').update(hashInput).digest('hex');

    // Prepare event data
    const eventData = {
      organization_id: orgId,
      event_type: eventType,
      event_timestamp: timestamp,
      instantly_workspace_id: event.workspace_id || event.workspace,
      instantly_campaign_id: event.campaign_id || event.campaign,
      instantly_campaign_name: event.campaign_name,
      lead_email: leadEmail,
      email_account: event.from_email || event.sender || event.email_account,
      unibox_url: event.unibox_url || event.reply_url,
      raw_payload: event,
      event_hash: eventHash
    };

    // Store the event and update business engagement
    const result = await instantlyEvents.create(eventData);

    if (result.error) {
      // Check if it's a duplicate (unique constraint on event_hash)
      if (result.error.code === '23505') {
        console.log(`⏭️ Duplicate event ignored: ${eventHash}`);
        return res.status(200).json({ status: 'duplicate', message: 'Event already processed' });
      }
      throw new Error(result.error.message || 'Failed to store event');
    }

    console.log(`✅ Event stored: ${eventType} for ${leadEmail} (business: ${result.business_id || 'not matched'})`);

    res.status(200).json({
      status: 'success',
      event_id: result.id,
      business_matched: !!result.business_id
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/webhooks/instantly/:orgId/test - Test webhook connectivity
app.get('/api/webhooks/instantly/:orgId/test', async (req, res) => {
  const { orgId } = req.params;

  try {
    const org = await organizations.getById(orgId);
    if (!org) {
      return res.status(404).json({
        status: 'error',
        message: 'Organization not found'
      });
    }

    res.json({
      status: 'ok',
      organization: org.name,
      webhook_url: `${req.protocol}://${req.get('host')}/api/webhooks/instantly/${orgId}`,
      message: 'Webhook endpoint is ready to receive events'
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// GET /api/organizations/:orgId/webhook-url - Get webhook URL for settings UI
app.get('/api/organizations/:orgId/webhook-url', async (req, res) => {
  const { orgId } = req.params;

  try {
    const org = await organizations.getById(orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Construct webhook URL (use environment variable for production)
    const baseUrl = process.env.WEBHOOK_BASE_URL || `http://localhost:${port}`;
    const webhookUrl = `${baseUrl}/api/webhooks/instantly/${orgId}`;

    res.json({
      organization_id: orgId,
      organization_name: org.name,
      webhook_url: webhookUrl,
      instructions: 'Copy this URL to your Instantly workspace webhook settings'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/instantly/events/recent - Get recent events (optionally by org)
app.get('/api/instantly/events/recent', async (req, res) => {
  try {
    const { orgId, limit = 50 } = req.query;
    const events = await instantlyEvents.getRecent(orgId || null, parseInt(limit));
    res.json({ data: events, total: events.length });
  } catch (error) {
    console.error('Error fetching recent events:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/instantly/events/by-email/:email - Get events for a specific lead
app.get('/api/instantly/events/by-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { orgId } = req.query;
    const events = await instantlyEvents.getByEmail(email, orgId || null);
    res.json({ data: events, total: events.length, email });
  } catch (error) {
    console.error('Error fetching events by email:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/instantly/campaigns/:campaignId/stats - Get engagement stats for a campaign
app.get('/api/instantly/campaigns/:campaignId/stats', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const stats = await instantlyEvents.getCampaignStats(campaignId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/organizations/:orgId/engagement-summary - Get org-wide engagement summary
app.get('/api/organizations/:orgId/engagement-summary', async (req, res) => {
  try {
    const { orgId } = req.params;

    const org = await organizations.getById(orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const summary = await instantlyEvents.getOrgEngagementSummary(orgId);
    res.json({
      organization_id: orgId,
      organization_name: org.name,
      ...summary
    });
  } catch (error) {
    console.error('Error fetching engagement summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/organizations - List all organizations
app.get('/api/organizations', async (req, res) => {
  try {
    const orgs = await organizations.getAll();
    res.json({ data: orgs, total: orgs.length });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/organizations/:orgId - Get a single organization
app.get('/api/organizations/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;
    const org = await organizations.getById(orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(org);
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// SERVE REACT FRONTEND (Production)
// =============================================================================

// Serve static files from React build
const frontendBuildPath = path.join(__dirname, 'frontend', 'build');
if (fs.existsSync(frontendBuildPath)) {
  console.log('📦 Serving React frontend from:', frontendBuildPath);
  app.use(express.static(frontendBuildPath));

  // Handle React routing - serve index.html for any non-API routes
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/api-keys') ||
        req.path.startsWith('/settings') || req.path.startsWith('/prompts') ||
        req.path.startsWith('/supabase') || req.path.startsWith('/organizations') ||
        req.path.startsWith('/campaigns') || req.path.startsWith('/audiences') ||
        req.path.startsWith('/products') || req.path.startsWith('/run-script') ||
        req.path.startsWith('/script-') || req.path.startsWith('/test-') ||
        req.path.startsWith('/generate-') || req.path.startsWith('/sample-') ||
        req.path.startsWith('/export-') || req.path.startsWith('/execution-') ||
        req.path.startsWith('/stop-') || req.path.startsWith('/current-') ||
        req.path.startsWith('/set-')) {
      return next();
    }
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  console.log('ℹ️  No frontend build found. Run "npm run build" to create it.');
}

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
  console.log('- GET  /organizations/:id/products');
  console.log('- POST /organizations/:id/products');
  console.log('- GET  /products/:id');
  console.log('- PUT  /products/:id');
  console.log('- DELETE /products/:id');
  console.log('- PUT  /products/:id/set-default');
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
  console.log('- GET  /api/master-leads');
  console.log('- GET  /api/master-leads/stats');
  console.log('- POST /api/master-leads/refresh');
  console.log('- GET  /api/master-leads/search');
  console.log('- GET  /api/master-leads/export');
  console.log('- GET  /api/demographics/:zipCode');
  console.log('- GET  /api/demographics/search');
  console.log('- GET  /api/demographics/opportunities');
  console.log('- GET  /api/demographics/stats');
  console.log('- GET  /api/demographics/states');
  console.log('- GET  /api/demographics/tier/:tier');
  console.log('- POST /api/demographics/sync');
  console.log('- POST /api/demographics/calculate-scores');
  console.log('- POST /api/demographics/bulk');
});