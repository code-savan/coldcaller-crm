import { NextRequest, NextResponse } from "next/server";
import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
import { extractBusinessInfoWithLLM, cleanBusinessName, batchExtractBusinessInfo } from '@/lib/aiExtractor';

// Find system Chrome executable
function findChrome(): string {
  const platforms = {
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ],
    linux: [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ],
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ],
  };

  const platform = process.platform as 'darwin' | 'linux' | 'win32';
  const chromePaths = platforms[platform] || platforms.linux;

  for (const chromePath of chromePaths) {
    try {
      execSync(`"${chromePath}" --version`, { stdio: 'ignore' });
      return chromePath;
    } catch {
      continue;
    }
  }

  // Fallback: try to find via which command on mac/linux
  if (platform !== 'win32') {
    try {
      return execSync('which google-chrome || which chromium || which chromium-browser').toString().trim();
    } catch {
      // Ignore
    }
  }

  throw new Error('Could not find Chrome installation. Please install Google Chrome.');
}

// Meta Ads Library API types
interface MetaAd {
  id: string;
  ad_snapshot_url: string;
  ad_creative_bodies?: string[];
  ad_creative_link_captions?: string[];
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  ad_delivery_status?: 'ACTIVE' | 'INACTIVE';

  // Page info
  page_id?: string;
  page_name?: string;
  page_url?: string;

  // AI-extracted fields
  ai_extracted_phone?: string;
  ai_extracted_owner?: string;
  ai_extracted_city?: string;
  ai_extracted_state?: string;
  ai_confidence?: number;

  // Additional fields
  impressions?: {
    lower_bound: string;
    upper_bound: string;
  };
  publisher_platforms?: string[];
  estimated_audience_size?: {
    lower_bound: number;
    upper_bound: number;
  };
}

interface MetaAdsResponse {
  data: MetaAd[];
  paging?: {
    cursors?: {
      after?: string;
    };
    next?: string;
  };
}

// AI Scoring Result
interface AIScoreResult {
  score: number;
  flags: string[];
  isAgency: boolean;
  confidence: number;
  reason: string;
}

// Rate limiting config
const RATE_LIMITS = {
  requestsPerMinute: 20,
  minDelayMs: 3000, // 3 seconds between calls
  maxRetries: 3,
};

// Agency detection keywords
const AGENCY_KEYWORDS = [
  'marketing', 'agency', 'media', 'leads', 'advertising', 'digital',
  'solutions', 'consulting', 'services', 'management', 'growth',
  'roi', 'campaigns', 'clients', 'we help', 'we generate'
];

const OWNER_KEYWORDS = [
  'roofing', 'hvac', 'plumbing', 'electrical', 'our crew', 'our team',
  'we do', 'we install', 'we repair', 'we service', 'contact us',
  'free estimate', 'locally owned', 'family owned', 'years experience'
];

// AI Scoring Heuristic
function calculateAIScore(ad: MetaAd): AIScoreResult {
  let score = 0;
  const flags: string[] = [];

  const pageName = (ad.page_name || '').toLowerCase();
  const adBodies = (ad.ad_creative_bodies || []).join(' ').toLowerCase();
  const adCaptions = (ad.ad_creative_link_captions || []).join(' ').toLowerCase();
  const allText = `${pageName} ${adBodies} ${adCaptions}`;

  // Page Name Analysis
  const hasAgencyKeywords = AGENCY_KEYWORDS.some(kw => pageName.includes(kw));
  const hasOwnerKeywords = OWNER_KEYWORDS.some(kw => pageName.includes(kw));

  if (hasAgencyKeywords) {
    score -= 40;
    flags.push('agency_keywords_in_name');
  }

  if (hasOwnerKeywords) {
    score += 20;
  }

  // Ad Copy Analysis
  const adHasAgencySpeak = AGENCY_KEYWORDS.some(kw =>
    adBodies.includes(kw) || adCaptions.includes(kw)
  );
  const adHasOwnerSpeak = OWNER_KEYWORDS.some(kw =>
    adBodies.includes(kw) || adCaptions.includes(kw)
  );

  if (adHasAgencySpeak) {
    score -= 30;
    flags.push('agency_speak_in_ad');
  }

  if (adHasOwnerSpeak) {
    score += 25;
  }

  // Active ad bonus (they're spending NOW)
  if (ad.ad_delivery_status === 'ACTIVE') {
    score += 15;
  }

  // Recent start bonus
  if (ad.ad_delivery_start_time) {
    const startDate = new Date(ad.ad_delivery_start_time);
    const daysAgo = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysAgo <= 7) {
      score += 25;
    } else if (daysAgo <= 14) {
      score += 15;
    } else if (daysAgo > 30) {
      score -= 10;
    }
  }

  // Multi-platform bonus (serious spenders)
  if (ad.publisher_platforms && ad.publisher_platforms.length > 1) {
    score += 10;
  }

  // Determine result
  let isAgency = false;
  let confidence = 50;
  let reason = '';

  if (score >= 50) {
    isAgency = false;
    confidence = Math.min(90, 50 + score / 2);
    reason = 'Strong indicators of direct business owner';
  } else if (score >= 20) {
    isAgency = false;
    confidence = 60;
    reason = 'Likely business owner, some uncertainty';
    flags.push('low_confidence');
  } else if (score >= -10) {
    isAgency = false;
    confidence = 40;
    reason = 'Unclear - needs manual review';
    flags.push('manual_review_recommended');
  } else {
    isAgency = true;
    confidence = Math.min(90, 50 + Math.abs(score) / 2);
    reason = 'Multiple agency indicators detected';
  }

  return {
    score: Math.max(0, Math.min(100, score + 50)), // Normalize to 0-100
    flags,
    isAgency,
    confidence,
    reason
  };
}

// Generate warm opener based on ad data
function generateWarmOpener(ad: MetaAd, niche: string): string {
  const daysAgo = ad.ad_delivery_start_time
    ? Math.floor((Date.now() - new Date(ad.ad_delivery_start_time).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const adText = (ad.ad_creative_bodies || [])[0] || '';

  // Check for specific services mentioned
  const hasEmergency = adText.toLowerCase().includes('emergency') || adText.toLowerCase().includes('24/7');
  const hasFreeEstimate = adText.toLowerCase().includes('free estimate') || adText.toLowerCase().includes('free inspection');

  if (daysAgo !== null && daysAgo <= 7) {
    if (hasEmergency) {
      return `Hey, saw you just started running ads for emergency ${niche.toLowerCase()} services this week - are you getting flooded with calls?`;
    }
    return `Hey, noticed you just started advertising ${niche.toLowerCase()} services a few days ago - how are the ads performing so far?`;
  }

  if (daysAgo !== null && daysAgo <= 14) {
    return `Hey, saw you've been running ads for ${niche.toLowerCase()} work the past couple weeks - curious if they're bringing in quality leads?`;
  }

  if (hasFreeEstimate) {
    return `Saw your ad offering free estimates for ${niche.toLowerCase()} - are you getting good response from the ads?`;
  }

  return `Hey, saw you're running ads for ${niche.toLowerCase()} services in the area - wondered if those are working well for you?`;
}

// Scrape Meta Ads Library using Puppeteer
async function scrapeMetaAds(
  niche: string,
  location: string,
  adRecencyDays: number,
  targetCount: number
): Promise<MetaAd[]> {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: findChrome(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
  });

  const ads: MetaAd[] = [];

  try {
    const page = await browser.newPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Set extra headers for more realistic browser behavior
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
    });

    // Override navigator.webdriver to hide automation
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      // @ts-ignore
      window.chrome = { runtime: {} };
    });

    // Build Meta Ads Library URL
    const searchUrl = new URL('https://www.facebook.com/ads/library/');
    searchUrl.searchParams.append('active_status', 'active');
    searchUrl.searchParams.append('ad_type', 'all');
    searchUrl.searchParams.append('country', 'US');
    searchUrl.searchParams.append('q', niche);

    console.log(`Navigating to Meta Ads Library: ${searchUrl.toString()}`);

    // Navigate to the page
    await page.goto(searchUrl.toString(), {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Try to accept cookies if popup appears
    try {
      const cookieButton = await page.$('button[data-cookiebanner="accept_button"]');
      if (cookieButton) {
        await cookieButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (e) {
      // No cookie banner, continue
    }

    // Wait for ad results to load
    await page.waitForSelector('[data-testid="ad-preview-card"], .xh8yej3, [role="article"]', {
      timeout: 10000,
    }).catch(() => {
      console.log('Ad results selector not found, trying alternative...');
    });

    // Wait for page to fully render
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Debug: Get page HTML to understand structure
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);

    // Take screenshot for debugging (save to tmp)
    try {
      await page.screenshot({ path: '/tmp/meta-ads-debug.png', fullPage: false });
      console.log('Screenshot saved to /tmp/meta-ads-debug.png');
    } catch (e) {
      console.log('Could not save screenshot:', e);
    }

    // Scroll to load more ads
    let previousHeight = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 10;

    while (ads.length < targetCount && scrollAttempts < maxScrollAttempts) {
      // Collect raw ad content from the page for AI processing
      const rawAdContent = await page.evaluate(() => {
        const results: any[] = [];

        // Get all text content chunks that might be ads
        // Facebook uses obfuscated class names, so we look for patterns
        const textNodes: { text: string; links: string[] }[] = [];

        // Find all links to facebook pages
        const pageLinks = Array.from(document.querySelectorAll('a[href*="facebook.com"]'));

        for (const link of pageLinks) {
          const href = link.getAttribute('href') || '';
          // Skip if it's not a page link or is navigation
          if (!href.includes('/pages/') && !href.match(/facebook\.com\/[^\/]+$/)) continue;

          // Get surrounding container text
          let container: Element | null = link;
          let containerText = '';

          for (let i = 0; i < 8; i++) {
            if (!container) break;
            container = container.parentElement;
            if (container) {
              const text = container.textContent || '';
              if (text.length > 200 && text.length < 8000) {
                containerText = text;
                break;
              }
            }
          }

          if (containerText && !containerText.includes('Privacy') && !containerText.includes('Terms')) {
            // Extract all links in this container
            const links = Array.from(container?.querySelectorAll('a') || [])
              .map(a => a.getAttribute('href'))
              .filter((h): h is string => !!h);

            textNodes.push({
              text: containerText.slice(0, 2000),
              links
            });
          }
        }

        return textNodes;
      });

      // Use AI to extract business info from raw content
      console.log(`AI analyzing ${rawAdContent.length} content blocks...`);

      for (const content of rawAdContent.slice(0, 15)) { // Limit to avoid rate limits
        if (ads.length >= targetCount) break;

        // Find the Facebook page URL (skip l.facebook.com redirects)
        const pageUrl = content.links.find(l =>
          l.includes('facebook.com') &&
          !l.includes('ads/library') &&
          !l.includes('l.facebook.com') && // Skip redirect links
          !l.includes('/play.google.com/') && // Skip app links
          !l.includes('amazon.com') // Skip product links
        );
        if (!pageUrl) continue;

        // Use AI to extract structured business info
        const extracted = await extractBusinessInfoWithLLM(
          content.text,
          pageUrl,
          niche
        );

        if (extracted && extracted.business_name) {
          // Check for duplicates
          const isDuplicate = ads.some(a =>
            a.page_name?.toLowerCase() === extracted.business_name.toLowerCase()
          );

          if (!isDuplicate) {
            ads.push({
              id: 'ai_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
              page_id: pageUrl.split('/').pop() || '',
              page_name: extracted.business_name,
              page_url: pageUrl,
              ad_creative_bodies: [content.text],
              ad_snapshot_url: pageUrl,
              ad_delivery_status: 'ACTIVE',
              ad_delivery_start_time: new Date().toISOString(),
              publisher_platforms: ['facebook'],
              // AI extracted fields
              ai_extracted_phone: extracted.phone,
              ai_extracted_owner: extracted.owner_name,
              ai_extracted_city: extracted.city,
              ai_extracted_state: extracted.state,
              ai_confidence: extracted.confidence,
            });

            console.log(`AI extracted: ${extracted.business_name} (confidence: ${extracted.confidence})`);
          }
        }

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`Found ${ads.length} unique businesses so far...`);

      if (ads.length >= targetCount) break;

      // Scroll down
      const currentHeight = await page.evaluate(() => document.body.scrollHeight);
      await page.evaluate(() => window.scrollBy(0, 800));
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (currentHeight === previousHeight) {
        scrollAttempts++;
        if (scrollAttempts >= 3) break; // No more content loading
      } else {
        scrollAttempts = 0;
        previousHeight = currentHeight;
      }
    }

    console.log(`Scraped ${ads.length} ads from Meta Ads Library`);

  } catch (error) {
    console.error('Puppeteer scraping error:', error);
  } finally {
    await browser.close();
  }

  return ads;
}

// Extract phone numbers from text using regex
function extractPhoneNumbers(text: string): string[] {
  const phonePatterns = [
    // (123) 456-7890
    /\(\d{3}\)\s*\d{3}[-.]?\d{4}/g,
    // 123-456-7890
    /\d{3}[-.]?\d{3}[-.]?\d{4}/g,
    // 123.456.7890
    /\d{3}\.\d{3}\.\d{4}/g,
    // 123 456 7890
    /\d{3}\s+\d{3}\s+\d{4}/g,
  ];

  const phones: string[] = [];
  for (const pattern of phonePatterns) {
    const matches = text.match(pattern) || [];
    phones.push(...matches);
  }

  // Normalize to 123-456-7890 format and remove duplicates
  return [...new Set(phones.map(p => p.replace(/[^\d]/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')))];
}

// Extract phone from Facebook page
async function extractPhoneFromPage(page: any, pageUrl: string): Promise<string> {
  try {
    // Navigate to the page
    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Look for phone number in page content
    const pageContent = await page.evaluate(() => {
      // Common places where phone numbers appear
      const selectors = [
        'a[href^="tel:"]',
        '[role="button"]:has-text("Call")',
        'span:contains("Call")',
        'span:contains("Phone")',
      ];

      // Get all text content
      const bodyText = document.body.innerText || '';
      const footerText = document.querySelector('footer')?.textContent || '';
      const contactSection = document.querySelector('[data-testid="contact_section"], [role="dialog"]')?.textContent || '';

      return {
        bodyText,
        footerText,
        contactSection,
        telLinks: Array.from(document.querySelectorAll('a[href^="tel:"]')).map(a => ({
          href: a.getAttribute('href'),
          text: a.textContent
        })),
      };
    });

    // Extract phones from all sources
    const allText = `${pageContent.bodyText} ${pageContent.footerText} ${pageContent.contactSection}`;
    const phones = extractPhoneNumbers(allText);

    // Also check tel: links directly
    for (const link of pageContent.telLinks) {
      if (link.href) {
        const phone = link.href.replace('tel:', '').replace(/[^\d]/g, '');
        if (phone.length === 10) {
          return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
        }
      }
    }

    // Return first found phone number
    if (phones.length > 0) {
      return phones[0];
    }

    return '';
  } catch (error) {
    console.log(`Could not extract phone from ${pageUrl}:`, error);
    return '';
  }
}

// Fallback: Generate mock leads for development/testing when API fails
function generateMockLeads(
  niche: string,
  city: string,
  state: string,
  targetCount: number,
  adRecencyDays: number
): any[] {
  const mockBusinesses = [
    { name: `${city} Pro ${niche}`, type: 'owner', daysAgo: 3 },
    { name: `A1 ${niche} Solutions`, type: 'agency', daysAgo: 5 },
    { name: `${niche} Masters LLC`, type: 'owner', daysAgo: 7 },
    { name: `Elite ${niche} Services`, type: 'owner', daysAgo: 12 },
    { name: `Digital Marketing Pros`, type: 'agency', daysAgo: 2 },
    { name: `Fast ${niche} Repair`, type: 'owner', daysAgo: 4 },
    { name: `${city} ${niche} Co`, type: 'owner', daysAgo: 8 },
    { name: `Growth Agency`, type: 'agency', daysAgo: 15 },
    { name: `Family ${niche}`, type: 'owner', daysAgo: 6 },
    { name: `Lead Gen Experts`, type: 'agency', daysAgo: 9 },
  ];

  const leads: any[] = [];

  for (let i = 0; i < Math.min(targetCount, mockBusinesses.length); i++) {
    const biz = mockBusinesses[i % mockBusinesses.length];
    const isAgency = biz.type === 'agency';
    const score = isAgency ? 30 : 75;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - biz.daysAgo);

    const adText = isAgency
      ? `We help ${niche.toLowerCase()} businesses get more leads! Our proven system generates 50+ qualified appointments monthly. Book a strategy call today.`
      : `Our crew has 15+ years fixing ${niche.toLowerCase()} issues in ${city}. Free estimates, same-day service. Call us today!`;

    leads.push({
      username: 'mock',
      business_name: biz.name,
      contact_name: '',
      phone: '(555) 000-0000',
      city: city || 'Unknown',
      state: state || '',
      niche,
      website: '',
      notes: `Mock Meta Ads Discovery\nAd ID: mock_${i}`,
      status: 'not_called',
      call_count: 0,
      verified: false,
      verification_score: score,
      verification_data: {
        meta_ad_id: `mock_${i}`,
        page_id: `page_${i}`,
        ad_snapshot_url: `https://www.facebook.com/ads/library/?id=mock_${i}`,
      },
      source: 'meta_ads' as const,
      source_url: `https://www.facebook.com/ads/library/?id=mock_${i}`,
      source_id: `page_${i}`,
      discovery_context: isAgency
        ? `Hey, saw you started running ads for ${niche.toLowerCase()} businesses recently - do you handle the work directly or refer it out?`
        : `Hey, noticed you just started advertising ${niche.toLowerCase()} services in ${city} a few days ago - how are the ads performing?`,
      ad_start_date: startDate.toISOString(),
      ad_spend_indicator: 'medium' as const,
      source_priority_score: score,
      ai_recommended: !isAgency,
      ai_reason: isAgency ? 'Multiple agency indicators detected' : 'Strong indicators of direct business owner',
      ai_flags: isAgency ? ['agency_keywords_in_name', 'manual_review_recommended'] : [],
      review_status: isAgency ? 'flagged' : 'approved',
    });
  }

  return leads;
}

// POST handler - Start discovery job
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      username,
      niche,
      city,
      state,
      ad_recency_days = 14,
      target_count = 50
    } = body;

    if (!username || !niche) {
      return NextResponse.json(
        { error: 'Username and niche are required' },
        { status: 400 }
      );
    }

    const location = city ? `${city}, ${state || 'US'}` : (state || 'US');

    // Create discovery job
    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username,
      status: 'running' as const,
      source: 'meta_ads' as const,
      niche,
      location,
      ad_recency_days,
      target_count,
      leads_found: 0,
      leads_approved: 0,
      leads_flagged: 0,
      current_page: 0,
      leads: [],
      total_api_calls: 0,
      last_api_call_at: new Date().toISOString(),
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    // Start discovery process using Puppeteer
    let discoveredLeads: any[] = [];
    let usingFallback = false;

    try {
      // Scrape ads using Puppeteer
      const scrapedAds = await scrapeMetaAds(niche, location, ad_recency_days, target_count);

      if (scrapedAds.length === 0) {
        // If scraping fails, use mock data for development
        console.log('Meta Ads scraping returned no results, using mock data for development');
        discoveredLeads = generateMockLeads(niche, city || '', state || '', target_count, ad_recency_days);
        discoveredLeads = discoveredLeads.map(l => ({ ...l, username }));
        usingFallback = true;
      } else {
        // Process AI-extracted ads - data already extracted during scraping
        for (const ad of scrapedAds) {
          if (discoveredLeads.length >= target_count) break;

          // Skip if no page info
          if (!ad.page_id || !ad.page_name) continue;

          // Use AI-extracted phone (already extracted during scraping)
          const phone = ad.ai_extracted_phone || '';

          // SKIP leads without phone numbers - this is critical!
          if (!phone) {
            console.log(`Skipping ${ad.page_name} - no phone number found`);
            continue;
          }

          // AI Scoring
          const aiScore = calculateAIScore(ad);

          // Generate warm opener
          const warmOpener = generateWarmOpener(ad, niche);

          // Use AI-extracted owner name if available
          const ownerName = ad.ai_extracted_owner || '';

          // Create lead object with AI-extracted data
          const lead = {
            username,
            business_name: ad.page_name,
            contact_name: ownerName, // AI-extracted owner name
            phone,
            city: ad.ai_extracted_city || '',
            state: ad.ai_extracted_state || '',
            niche,
            website: '',
            notes: `Meta Ads Discovery\nAd ID: ${ad.id}\nPage ID: ${ad.page_id}\nPhone: ${phone}${ownerName ? '\nOwner: ' + ownerName : ''}\nAI Confidence: ${ad.ai_confidence || 0}%`,
            status: 'not_called' as const,
            call_count: 0,
            verified: true, // Has phone = verified
            verification_score: aiScore.score + 10 + ((ad.ai_confidence || 0) > 80 ? 10 : 0), // Bonus for phone + high confidence
            verification_data: {
              meta_ad_id: ad.id,
              page_id: ad.page_id,
              ad_snapshot_url: ad.ad_snapshot_url,
              phone_source: 'ai_extracted',
              ai_confidence: ad.ai_confidence || 0,
              owner_name: ownerName,
            },

            // Meta Ads specific
            source: 'meta_ads' as const,
            source_url: ad.page_url || ad.ad_snapshot_url,
            source_id: ad.page_id,
            discovery_context: warmOpener,
            ad_start_date: ad.ad_delivery_start_time,
            ad_spend_indicator: 'medium',

            // AI scoring
            source_priority_score: aiScore.score,
            ai_recommended: aiScore.score >= 50 && !aiScore.isAgency,
            ai_reason: aiScore.reason,
            ai_flags: aiScore.flags,
            review_status: aiScore.score >= 50 ? 'approved' : 'flagged' as const,
          };

          discoveredLeads.push(lead);
          console.log(`Added lead: ${ad.page_name} with phone ${phone}${ownerName ? ', Owner: ' + ownerName : ''}`);
        }

        console.log(`Final: ${discoveredLeads.length} leads with phone numbers found`);
      }
    } catch (error) {
      console.error('Error during Meta Ads discovery:', error);
      // Fall back to mock data
      discoveredLeads = generateMockLeads(niche, city || '', state || '', target_count, ad_recency_days);
      discoveredLeads = discoveredLeads.map(l => ({ ...l, username }));
      usingFallback = true;
    }

    // Count by status
    const approved = discoveredLeads.filter(l => l.review_status === 'approved');
    const flagged = discoveredLeads.filter(l => l.review_status === 'flagged');

    return NextResponse.json({
      job_id: job.id,
      leads: discoveredLeads,
      total_found: discoveredLeads.length,
      leads_approved: approved.length,
      leads_flagged: flagged.length,
      niche,
      location,
      ad_recency_days,
      using_fallback: usingFallback,
      scraped: !usingFallback,
    });

  } catch (error) {
    console.error('Meta Ads discovery error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET handler - Check job status (for background processing)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('job_id');

  if (!jobId) {
    return NextResponse.json(
      { error: 'Job ID is required' },
      { status: 400 }
    );
  }

  // In production, fetch from database
  // For now, return placeholder
  return NextResponse.json({
    job_id: jobId,
    status: 'completed',
    progress: 100,
  });
}
