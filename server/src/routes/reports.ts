import { Router } from 'express';
import { db } from '../db';
import { searches, businesses, enrichmentData } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/:searchId/export', async (req, res) => {
    const { searchId } = req.params;
    const format = req.query.format || 'json';

    try {
        const [search] = await db.select().from(searches).where(eq(searches.id, Number(searchId)));
        if (!search) return res.status(404).json({ error: 'Search not found' });

        const results = await db.select().from(businesses).where(eq(businesses.searchId, Number(searchId)));

        const fullData = await Promise.all(results.map(async (b: any) => {
            const enrichment = await db.select().from(enrichmentData).where(eq(enrichmentData.businessId, b.id));
            return { ...b, enrichment: enrichment.map((e: any) => JSON.parse(e.data as string)) };
        }));

        if (format === 'csv') {
            // Simple CSV generation
            const headers = ['Name', 'Address', 'Phone', 'Website', 'Emails', 'Socials', 'Sentiment', 'Confidence'];
            const rows = fullData.map((b: any) => {
                const emails = b.enrichment[0]?.emails?.join('; ') || '';
                const socials = b.enrichment[0]?.socialProfiles?.join('; ') || '';
                const sentiment = b.enrichment[0]?.sentiment || 'Neutral';
                const confidence = b.enrichment[0]?.confidenceScore || 0.5;
                return [
                    `"${b.name}"`,
                    `"${b.address || ''}"`,
                    `"${b.phone || ''}"`,
                    `"${b.website || ''}"`,
                    `"${emails}"`,
                    `"${socials}"`,
                    `"${sentiment}"`,
                    `"${confidence}"`
                ].join(',');
            });

            res.header('Content-Type', 'text/csv');
            res.attachment(`report-${searchId}.csv`);
            return res.send([headers.join(','), ...rows].join('\n'));
        }

        if (format === 'pdf') {
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument();

            res.header('Content-Type', 'application/pdf');
            res.attachment(`report-${searchId}.pdf`);
            doc.pipe(res);

            doc.fontSize(20).text(`Business Intelligence Report`, { align: 'center' });
            doc.fontSize(12).text(`Search ID: ${searchId}`, { align: 'center' });
            doc.moveDown();

            fullData.forEach((b: any, i: number) => {
                const enrichment = b.enrichment[0] || {};

                doc.fontSize(16).text(`${i + 1}. ${b.name}`);
                doc.fontSize(10).text(`Address: ${b.address || 'N/A'}`);
                doc.text(`Phone: ${b.phone || 'N/A'}`);
                doc.text(`Website: ${b.website || 'N/A'}`);
                doc.text(`Rating: ${b.rating || 'N/A'} (${b.reviewsCount || 0} reviews)`);

                doc.moveDown(0.5);
                doc.font('Helvetica-Bold').text('Deep Research:');
                doc.font('Helvetica').text(`Sentiment: ${enrichment.sentiment || 'Neutral'}`);
                doc.text(`Confidence Score: ${enrichment.confidenceScore || 0.5}`);
                doc.text(`Emails: ${enrichment.emails?.join(', ') || 'None found'}`);
                doc.text(`Social Profiles:`);
                if (enrichment.socialProfiles?.length) {
                    enrichment.socialProfiles.forEach((p: string) => doc.text(`  - ${p}`));
                } else {
                    doc.text(`  None found`);
                }

                doc.moveDown();
                doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
                doc.moveDown();
            });

            doc.end();
            return;
        }

        // Default JSON
        res.json({ search, results: fullData });

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
