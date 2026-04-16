import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ExtractedBusinessInfo {
  business_name: string;
  owner_name?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  confidence: number; // 0-100
  source_url: string;
}

/**
 * Quick pre-check to see if content looks like it might contain business info
 * This saves API calls on obviously bad content
 */
function looksLikeBusinessContent(text: string, niche: string): boolean {
  const lowerText = text.toLowerCase();
  const hasBusinessIndicators =
    /\b(LLC|Inc|Corp|Company|Services|Repair|Roofing|Plumbing|Electric|HVAC|Contractor)\b/i.test(text) ||
    /\b(phone|call|contact|visit us|located at|address)\b/i.test(text) ||
    /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(text); // Has phone number

  const hasNicheTerms = new RegExp(`\\b${niche}\\b`, 'i').test(lowerText);

  return hasBusinessIndicators || hasNicheTerms;
}

/**
 * Use LLM to intelligently extract business information from scraped content
 */
export async function extractBusinessInfoWithLLM(
  pageContent: string,
  sourceUrl: string,
  niche: string
): Promise<ExtractedBusinessInfo | null> {
  // Quick pre-filter: skip if content doesn't look promising
  if (!looksLikeBusinessContent(pageContent, niche)) {
    return null;
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Extract business information from Facebook/Instagram ad content. Return clean, structured data.

Extract:
- business_name: Clean name (NO: "www.", ".com", "Learn more", "|" descriptions, URLs)
- owner_name: Owner if mentioned (e.g., "Owner: John Smith")
- phone: XXX-XXX-XXXX if found
- email: Email if found
- website: Website URL if found
- address: Street address if found
- city: City name
- state: 2-letter state (TX, CA, NY)
- confidence: 0-100 score based on data quality

Return null for missing fields. Business name is REQUIRED.`
        },
        {
          role: 'user',
          content: `Extract from this ${niche} ad content:

URL: ${sourceUrl}

Content:
${pageContent.slice(0, 3000)}

Return JSON with keys: business_name, owner_name, phone, email, website, address, city, state, confidence`
        }
      ],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const extracted = JSON.parse(content);

    // Validate
    if (!extracted.business_name || extracted.confidence < 60) {
      return null;
    }

    return {
      ...extracted,
      source_url: sourceUrl,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Batch extract from multiple pages
 */
export async function batchExtractBusinessInfo(
  pages: { content: string; url: string }[],
  niche: string
): Promise<ExtractedBusinessInfo[]> {
  const results: ExtractedBusinessInfo[] = [];

  // Process in parallel with rate limiting (5 at a time)
  const batchSize = 5;
  for (let i = 0; i < pages.length; i += batchSize) {
    const batch = pages.slice(i, i + batchSize);
    const batchPromises = batch.map(page =>
      extractBusinessInfoWithLLM(page.content, page.url, niche)
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter((r): r is ExtractedBusinessInfo => r !== null));

    // Small delay between batches to respect rate limits
    if (i + batchSize < pages.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Use LLM to guide the scraper on what selectors to use
 */
export async function getScrapingGuidance(
  pageHtml: string,
  goal: 'find_business_name' | 'find_phone' | 'find_owner' | 'find_address'
): Promise<{ selector: string; attribute?: string; confidence: number }> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert web scraper AI. Given HTML content from a Facebook business page, suggest the best CSS selector to extract specific information.

Return ONLY JSON with:
- selector: CSS selector string
- attribute: which attribute to extract (e.g., "textContent", "href", "innerText") - omit for textContent
- confidence: 0-100 confidence score

Focus on finding semantic elements, not obfuscated class names.`
        },
        {
          role: 'user',
          content: `Find the best selector to extract: ${goal}

HTML sample:
${pageHtml.slice(0, 3000)}

Return JSON: {"selector": "h1", "attribute": "textContent", "confidence": 90}`
        }
      ],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { selector: 'body', confidence: 0 };

    return JSON.parse(content);
  } catch (error) {
    console.error('Scraping guidance error:', error);
    return { selector: 'body', confidence: 0 };
  }
}

/**
 * Clean and normalize business name using LLM
 */
export async function cleanBusinessName(rawName: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Clean up messy business names. Remove:
- "www." prefixes
- Domain extensions (.com, .net)
- "Learn more", "Shop now", "Call today"
- Facebook page ID strings
- Pipes | and everything after them (usually descriptions)
- Duplicate words

Return only the clean business name, nothing else.`
        },
        {
          role: 'user',
          content: `Clean this business name: "${rawName}"`
        }
      ],
      temperature: 0,
      max_tokens: 100,
    });

    return response.choices[0]?.message?.content?.trim() || rawName;
  } catch (error) {
    return rawName;
  }
}
