import axios from 'axios';

export class ExaClient {
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.EXA_API_KEY || '';
    }

    async searchAndContents(query: string) {
        if (!this.apiKey) {
            console.warn('Exa API key not found. Returning empty results.');
            return { results: [] };
        }

        try {
            const response = await axios.post('https://api.exa.ai/search', {
                query,
                numResults: 3,
                contents: {
                    text: true
                }
            }, {
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Exa search failed:', error);
            return { results: [] };
        }
    }
}

export const exaClient = new ExaClient();
