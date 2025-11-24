require('dotenv').config({ path: './.env' });
const { serpScraper } = require('./dist/scraper/serp-scraper');
(async () => {
    try {
        const results = await serpScraper.searchGoogleMaps('Real Estate around Wuse');
        console.log('Results count:', results.length);
        console.log(results.slice(0, 3));
    } catch (e) {
        console.error('Error:', e.message);
    }
})();
