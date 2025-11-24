import { Router } from 'express';
import { db } from '../db';
import { businesses, enrichmentData } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { authenticateToken, requireAdmin, AuthRequest } from '../auth/middleware';
import { dataAggregator } from '../enrichment/aggregator';

const router = Router();

// Enrich selected businesses (Authenticated users)
router.post('/enrich', authenticateToken, async (req: AuthRequest, res) => {
    const { businessIds } = req.body;

    if (!businessIds || !Array.isArray(businessIds) || businessIds.length === 0) {
        return res.status(400).json({ error: 'businessIds array required' });
    }

    try {
        const results = {
            total: businessIds.length,
            skipped: 0,
            processed: 0,
            failed: 0
        };

        for (const businessId of businessIds) {
            try {
                // Check if already enriched
                const existing = await db.select()
                    .from(enrichmentData)
                    .where(eq(enrichmentData.businessId, businessId));

                if (existing.length > 0) {
                    console.log(`Business ${businessId} already enriched, skipping`);
                    results.skipped++;
                    continue;
                }

                // Get business details
                const business = await db.select()
                    .from(businesses)
                    .where(eq(businesses.id, businessId))
                    .limit(1);

                if (business.length === 0) {
                    console.log(`Business ${businessId} not found`);
                    results.failed++;
                    continue;
                }

                // Perform enrichment
                console.log(`Enriching business: ${business[0].name}`);
                const enrichedData = await dataAggregator.enrichBusiness(
                    business[0].name,
                    business[0].address || ''
                );

                // Store enrichment data
                await db.insert(enrichmentData).values({
                    businessId,
                    source: 'aggregator',
                    status: 'completed',
                    data: JSON.stringify(enrichedData),
                    progress: 100,
                    completedAt: new Date(),
                    createdAt: new Date()
                });

                results.processed++;
            } catch (error) {
                console.error(`Error enriching business ${businessId}:`, error);
                results.failed++;
            }
        }

        res.json({
            message: 'Enrichment completed',
            results
        });
    } catch (error) {
        console.error('Enrichment error:', error);
        res.status(500).json({ error: 'Failed to enrich businesses' });
    }
});

// Re-research businesses (Admin only)
router.post('/re-research', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const { businessIds } = req.body;

    if (!businessIds || !Array.isArray(businessIds) || businessIds.length === 0) {
        return res.status(400).json({ error: 'businessIds array required' });
    }

    try {
        // Delete existing enrichment data
        await db.delete(enrichmentData)
            .where(inArray(enrichmentData.businessId, businessIds));

        console.log(`Deleted enrichment data for ${businessIds.length} businesses`);

        // Re-enrich all businesses
        const results = {
            total: businessIds.length,
            processed: 0,
            failed: 0
        };

        for (const businessId of businessIds) {
            try {
                const business = await db.select()
                    .from(businesses)
                    .where(eq(businesses.id, businessId))
                    .limit(1);

                if (business.length === 0) {
                    results.failed++;
                    continue;
                }

                console.log(`Re-researching business: ${business[0].name}`);
                const enrichedData = await dataAggregator.enrichBusiness(
                    business[0].name,
                    business[0].address || ''
                );

                await db.insert(enrichmentData).values({
                    businessId,
                    source: 'aggregator',
                    status: 'completed',
                    data: JSON.stringify(enrichedData),
                    progress: 100,
                    completedAt: new Date(),
                    createdAt: new Date()
                });

                results.processed++;
            } catch (error) {
                console.error(`Error re-researching business ${businessId}:`, error);
                results.failed++;
            }
        }

        res.json({
            message: 'Re-research completed',
            results
        });
    } catch (error) {
        console.error('Re-research error:', error);
        res.status(500).json({ error: 'Failed to re-research businesses' });
    }
});

// Get enrichment data for a business
router.get('/:id/enrichment', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const enrichment = await db.select()
            .from(enrichmentData)
            .where(eq(enrichmentData.businessId, Number(id)));

        if (enrichment.length === 0) {
            return res.status(404).json({ error: 'Enrichment data not found' });
        }

        res.json(enrichment[0]);
    } catch (error) {
        console.error('Get enrichment error:', error);
        res.status(500).json({ error: 'Failed to fetch enrichment data' });
    }
});

export default router;
