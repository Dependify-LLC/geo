import { Router } from 'express';
import { db } from '../db';
import { savedLocations, sublocations, searches } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateToken, requireAdmin, AuthRequest } from '../auth/middleware';

const router = Router();

// Get all saved locations (available to all users)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const locations = await db.select().from(savedLocations);

        // Get sublocation count for each location
        const locationsWithCounts = await Promise.all(locations.map(async (loc) => {
            const subs = await db.select()
                .from(sublocations)
                .where(eq(sublocations.savedLocationId, loc.id));

            // Deduplicate by name
            const uniqueSubs = new Map();
            subs.forEach(s => uniqueSubs.set(s.name, s));

            return {
                ...loc,
                sublocationCount: uniqueSubs.size
            };
        }));

        res.json(locationsWithCounts);
    } catch (error) {
        console.error('Get locations error:', error);
        res.status(500).json({ error: 'Failed to fetch locations' });
    }
});

// Get sublocations for a saved location
router.get('/:id/sublocations', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const location = await db.select().from(savedLocations).where(eq(savedLocations.id, Number(id)));
        if (location.length === 0) {
            return res.status(404).json({ error: 'Location not found' });
        }

        // Get all sublocations for this saved location
        const subs = await db.select()
            .from(sublocations)
            .where(eq(sublocations.savedLocationId, Number(id)));

        // Deduplicate by name
        const uniqueSubs = new Map();
        subs.forEach(s => uniqueSubs.set(s.name, s));

        res.json({
            location: location[0],
            sublocations: Array.from(uniqueSubs.values())
        });
    } catch (error) {
        console.error('Get location sublocations error:', error);
        res.status(500).json({ error: 'Failed to fetch sublocations' });
    }
});

// Set primary search for a location (Admin only)
router.put('/:id/primary', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { searchId } = req.body;

    try {
        // Verify the search exists and belongs to this location
        const search = await db.select().from(searches).where(eq(searches.id, searchId));
        if (search.length === 0) {
            return res.status(404).json({ error: 'Search not found' });
        }

        if (search[0].savedLocationId !== Number(id)) {
            return res.status(400).json({ error: 'Search does not belong to this location' });
        }

        // Update the location's primary search
        await db.update(savedLocations)
            .set({
                primarySearchId: searchId,
                updatedAt: new Date()
            })
            .where(eq(savedLocations.id, Number(id)));

        res.json({ message: 'Primary search updated successfully' });
    } catch (error) {
        console.error('Update primary search error:', error);
        res.status(500).json({ error: 'Failed to update primary search' });
    }
});

// Update a saved location
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { name } = req.body;

    try {
        const location = await db.select().from(savedLocations).where(eq(savedLocations.id, Number(id)));
        if (location.length === 0) {
            return res.status(404).json({ error: 'Location not found' });
        }

        await db.update(savedLocations)
            .set({
                name,
                updatedAt: new Date()
            })
            .where(eq(savedLocations.id, Number(id)));

        res.json({ message: 'Location updated successfully' });
    } catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({ error: 'Failed to update location' });
    }
});

// Delete a saved location and all its sublocations
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const { id } = req.params;

    try {
        // Delete all sublocations first
        await db.delete(sublocations).where(eq(sublocations.savedLocationId, Number(id)));

        // Delete the location
        await db.delete(savedLocations).where(eq(savedLocations.id, Number(id)));

        res.json({ message: 'Location deleted successfully' });
    } catch (error) {
        console.error('Delete location error:', error);
        res.status(500).json({ error: 'Failed to delete location' });
    }
});

// Add a new sublocation to a saved location
router.post('/:id/sublocations', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { name, type } = req.body;

    try {
        const location = await db.select().from(savedLocations).where(eq(savedLocations.id, Number(id)));
        if (location.length === 0) {
            return res.status(404).json({ error: 'Location not found' });
        }

        // Insert the new sublocation (not linked to any specific search, searchId will be null)
        const [newSub] = await db.insert(sublocations).values({
            savedLocationId: Number(id),
            searchId: null as any, // Master sublocations aren't tied to a specific search
            name,
            type: type || 'district',
            status: 'pending',
            businessCount: 0,
            createdAt: new Date()
        }).returning();

        res.json({ message: 'Sublocation added successfully', sublocation: newSub });
    } catch (error) {
        console.error('Add sublocation error:', error);
        res.status(500).json({ error: 'Failed to add sublocation' });
    }
});

// Update a sublocation
router.put('/:id/sublocations/:subId', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const { id, subId } = req.params;
    const { name, type } = req.body;

    try {
        const sub = await db.select().from(sublocations)
            .where(and(
                eq(sublocations.id, Number(subId)),
                eq(sublocations.savedLocationId, Number(id))
            ));

        if (sub.length === 0) {
            return res.status(404).json({ error: 'Sublocation not found' });
        }

        await db.update(sublocations)
            .set({ name, type })
            .where(eq(sublocations.id, Number(subId)));

        res.json({ message: 'Sublocation updated successfully' });
    } catch (error) {
        console.error('Update sublocation error:', error);
        res.status(500).json({ error: 'Failed to update sublocation' });
    }
});

// Delete a sublocation
router.delete('/:id/sublocations/:subId', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const { id, subId } = req.params;

    try {
        await db.delete(sublocations)
            .where(and(
                eq(sublocations.id, Number(subId)),
                eq(sublocations.savedLocationId, Number(id))
            ));

        res.json({ message: 'Sublocation deleted successfully' });
    } catch (error) {
        console.error('Delete sublocation error:', error);
        res.status(500).json({ error: 'Failed to delete sublocation' });
    }
});

export default router;
