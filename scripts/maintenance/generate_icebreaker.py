#!/usr/bin/env python3
import sys
import json

def generate_icebreaker(api_key, contact_data, prompts, settings):
    try:
        from openai import OpenAI
        
        client = OpenAI(api_key=api_key)
        
        # Parse input data
        contact = json.loads(contact_data)
        prompt_templates = json.loads(prompts)
        ai_settings = json.loads(settings)
        
        # Prepare contact profile
        first_name = contact.get('first_name', '')
        last_name = contact.get('last_name', '')
        headline = contact.get('headline', '')
        location = contact.get('location', '')
        website_summaries = contact.get('website_summaries', [])
        
        profile = f"{first_name} {last_name} {headline}"
        website_content = "\\n".join(website_summaries)
        
        # Build messages for icebreaker generation
        messages = [
            {
                "role": "system",
                "content": "You're a helpful, intelligent sales assistant."
            },
            {
                "role": "user",
                "content": prompt_templates.get('icebreaker', '')
            },
            {
                "role": "assistant",
                "content": '{"icebreaker":"Hey Aina,\\\\n\\\\nLove what you\'re doing at Maki. Also doing some outsourcing right now, wanted to run something by you.\\\\n\\\\nSo I hope you\'ll forgive me, but I creeped you/Maki quite a bit. I know that discretion is important to you guys (or at least I\'m assuming this given the part on your website about white-labelling your services) and I put something together a few months ago that I think could help. To make a long story short, it\'s an outreach system that uses AI to find people hiring website devs. Then pitches them with templates (actually makes them a white-labelled demo website). Costs just a few cents to run, very high converting, and I think it\'s in line with Maki\'s emphasis on scalability."}'
            },
            {
                "role": "user",
                "content": f"Profile: {profile}\\n\\nWebsite: {website_content}"
            }
        ]
        
        # Make API call
        response = client.chat.completions.create(
            model=ai_settings.get('ai_model_icebreaker', 'gpt-4o'),
            messages=messages,
            temperature=ai_settings.get('ai_temperature', 0.5),
            response_format={"type": "json_object"}
        )
        
        result = response.choices[0].message.content
        parsed = json.loads(result)
        icebreaker = parsed.get('icebreaker', '')
        
        # Return response
        response_data = {
            "icebreaker": icebreaker,
            "contact": contact,
            "prompts_used": prompt_templates
        }
        
        print(json.dumps(response_data))
        return True
        
    except Exception as e:
        error_response = {
            "error": f"Icebreaker generation error: {str(e)}"
        }
        print(json.dumps(error_response))
        return False

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print('{"error": "Missing required arguments"}')
        sys.exit(1)
    
    api_key = sys.argv[1]
    contact_data = sys.argv[2]
    prompts = sys.argv[3]
    settings = sys.argv[4]
    
    success = generate_icebreaker(api_key, contact_data, prompts, settings)
    sys.exit(0 if success else 1)