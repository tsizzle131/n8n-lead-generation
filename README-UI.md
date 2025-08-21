# Lead Generation UI

A React-based user interface for managing and testing your AI-powered lead generation system. This UI allows you to:

- 🔑 **Manage API Keys** - Securely configure OpenAI and Apify API keys
- ✏️ **Edit Prompts** - Customize AI prompts for icebreaker generation
- 🧪 **Test Contacts** - Test your prompts with sample contact data
- ⚙️ **Configure Settings** - Adjust AI models, temperature, and rate limiting

## Quick Start

### Option 1: Simple Development (Recommended for Local Use)

1. **Install Dependencies**
   ```bash
   # Install Node.js dependencies for API server
   npm install
   
   # Install React dependencies
   cd frontend
   npm install
   cd ..
   ```

2. **Install Python Dependencies**
   ```bash
   pip3 install openai
   ```

3. **Start Development Environment**
   ```bash
   ./start-dev.sh
   ```
   
   This will start:
   - API server on http://localhost:8000
   - React UI on http://localhost:3000

### Option 2: Using FastAPI (More Advanced)

1. **Install FastAPI Dependencies**
   ```bash
   cd api
   pip3 install -r requirements.txt
   ```

2. **Start FastAPI Server**
   ```bash
   cd api
   uvicorn main:app --reload
   ```

3. **Start React Frontend**
   ```bash
   cd frontend
   npm start
   ```

## Getting Started

1. **Configure API Keys**
   - Open http://localhost:3000
   - Go to the "API Keys" tab
   - Add your OpenAI API key (required)
   - Optionally add your Apify API key
   - Click "Test OpenAI Connection" to verify

2. **Test with Sample Data**
   - Go to the "Contact Tester" tab
   - Click one of the sample contact buttons
   - Click "Generate Icebreaker"
   - Review the generated icebreaker

3. **Customize Prompts**
   - Go to the "Prompt Editor" tab
   - Edit the icebreaker prompt to match your style
   - Save changes and test in the Contact Tester

4. **Adjust Settings**
   - Go to the "Settings" tab
   - Choose AI models (GPT-4o for best quality, GPT-3.5-turbo for lowest cost)
   - Adjust temperature (0.3 for consistent, 0.7 for creative)
   - Set rate limiting delays

## Architecture

### Simple Express Server (`simple-server.js`)
- Lightweight Node.js/Express API
- Calls Python scripts for OpenAI interactions
- Stores configuration in memory
- Perfect for local development

### FastAPI Server (`api/main.py`)
- Full-featured Python API
- Direct OpenAI integration
- More advanced error handling
- Better for production deployment

### React Frontend (`frontend/`)
- TypeScript React application
- Responsive design
- Real-time prompt testing
- Sample data for safe testing

## Features

### API Key Management
- Secure storage and masking of API keys
- Connection testing
- Support for OpenAI and Apify keys

### Prompt Editor
- Live editing of AI prompts
- Tabbed interface for summary and icebreaker prompts
- Export/import prompt templates
- Character count and formatting tips

### Contact Tester
- Test prompts with sample contact data
- Multiple sample contacts provided
- Website summaries input
- Real-time icebreaker generation
- Copy results to clipboard

### Settings Panel
- AI model selection (GPT-4o, GPT-4o-mini, GPT-3.5-turbo)
- Temperature control slider
- Rate limiting configuration
- Cost estimation information

## Integration with Existing System

This UI works with your existing Python lead generation system:

1. **Test prompts here** with sample data
2. **Export your perfected prompts**
3. **Update your Python system** with the new prompts
4. **Run your production workflow** with confidence

The prompts you create here can be directly copied into your `lead_generation/modules/ai_processor.py` file.

## Switching to Real Data

Once you're satisfied with your prompts:

1. **Update your Python system** with the new prompts from the UI
2. **Run the existing main.py** to process real contacts
3. **Use the Google Sheets integration** for production workflow

The UI is designed for safe testing - no real contacts are contacted during testing.

## Troubleshooting

### API Connection Issues
- Verify your OpenAI API key is correct
- Check if you have sufficient API credits
- Ensure Python dependencies are installed

### Server Won't Start
- Make sure ports 3000 and 8000 are available
- Check if Node.js and Python are properly installed
- Try running servers individually to isolate issues

### React Build Issues
- Delete `node_modules` and run `npm install` again
- Clear React cache with `npm start -- --reset-cache`

## Next Steps

1. **Perfect your prompts** using the UI with sample data
2. **Test different AI models** to find the best quality/cost balance
3. **Export your final prompt templates**
4. **Integrate with your production system**
5. **Monitor results** and iterate as needed

---

For questions or issues, check the existing Python system documentation or create an issue.