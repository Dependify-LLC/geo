import { tavilyClient } from './tavily';
import { exaClient } from './exa';
import { firecrawlClient } from './firecrawl';

export interface EnrichedBusinessData {
    socialProfiles?: string[];
    emails?: string[];
    phones?: string[];
    newsMentions?: any[];
    websiteContent?: string;
    keyPersonnel?: string[];
    ownership?: string;
    sentiment?: string;
    confidenceScore?: number;
}

export class DataAggregator {
    async enrichBusiness(name: string, website?: string): Promise<EnrichedBusinessData> {
        console.log(`Enriching data for ${name}...`);

        const data: EnrichedBusinessData = {
            socialProfiles: [],
            emails: [],
            phones: [],
            newsMentions: [],
            keyPersonnel: [],
            ownership: 'Unknown',
            sentiment: 'Neutral',
            confidenceScore: 0.5, // Base confidence
        };

        // 1. Tavily for general info and news
        const searchResult = await tavilyClient.search(`${name} business contact social media owner`);
        if (searchResult.results) {
            // Extract social links from search results (heuristic)
            searchResult.results.forEach((res: any) => {
                if (res.url.includes('linkedin.com') || res.url.includes('twitter.com') || res.url.includes('facebook.com')) {
                    data.socialProfiles?.push(res.url);
                }
                // Simple heuristic for ownership/personnel from snippets
                if (res.content.includes('Owner') || res.content.includes('CEO') || res.content.includes('Founder')) {
                    // This is very rough, ideally we'd use an LLM to extract names
                    data.keyPersonnel?.push('Potential key personnel found in search results');
                }
            });
        }

        // 2. Exa for deep research / news
        const exaResult = await exaClient.searchAndContents(`${name} recent news business reviews`);
        if (exaResult.results) {
            data.newsMentions = exaResult.results;
            // Simple sentiment heuristic based on keywords in titles
            const positiveKeywords = ['great', 'best', 'award', 'growth', 'success'];
            const negativeKeywords = ['scam', 'fraud', 'lawsuit', 'bad', 'poor'];

            let score = 0;
            exaResult.results.forEach((res: any) => {
                const text = (res.title + ' ' + res.text).toLowerCase();
                if (positiveKeywords.some(k => text.includes(k))) score++;
                if (negativeKeywords.some(k => text.includes(k))) score--;
            });

            if (score > 0) data.sentiment = 'Positive';
            else if (score < 0) data.sentiment = 'Negative';

            // Boost confidence if we found news
            if (data.newsMentions && data.newsMentions.length > 0) data.confidenceScore = Math.min((data.confidenceScore || 0.5) + 0.2, 1.0);
        }

        // 3. Firecrawl for website scraping (if website exists)
        if (website) {
            const crawlResult = await firecrawlClient.scrapeUrl(website);
            if (crawlResult && crawlResult.data) {
                data.websiteContent = crawlResult.data.markdown;
                // Extract emails from content (simple regex)
                const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                const foundEmails = data.websiteContent?.match(emailRegex);
                if (foundEmails) {
                    data.emails = [...new Set(foundEmails)];
                    // Boost confidence if we verified data from official website
                    data.confidenceScore = Math.min((data.confidenceScore || 0.5) + 0.2, 1.0);
                }
            }
        }

        return data;
    }
}

export const dataAggregator = new DataAggregator();
