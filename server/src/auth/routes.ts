import express from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, comparePassword, generateToken } from './utils';
import { authenticateToken, requireAdmin, AuthRequest } from './middleware';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await db.select().from(users).where(eq(users.username, username)).limit(1);

        if (user.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await comparePassword(password, user[0].passwordHash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user[0]);
        res.json({ token, user: { id: user[0].id, username: user[0].username, role: user[0].role } });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Create User (Admin only)
router.post('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { username, password, role } = req.body;

        const existingUser = await db.select().from(users).where(eq(users.username, username));
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await hashPassword(password);

        await db.insert(users).values({
            username,
            passwordHash: hashedPassword,
            role: role || 'user',
        });

        res.status(201).json({ message: 'User created successfully' });

    } catch (error) {
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Get All Users (Admin only)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const allUsers = await db.select({
            id: users.id,
            username: users.username,
            role: users.role,
            createdAt: users.createdAt
        }).from(users);

        res.json(allUsers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Update User (Admin only)
router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, role } = req.body;

        // Check if user exists
        const existingUser = await db.select().from(users).where(eq(users.id, Number(id)));
        if (existingUser.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const updates: any = {};
        if (username) updates.username = username;
        if (role) updates.role = role;
        if (password) {
            updates.passwordHash = await hashPassword(password);
        }

        await db.update(users)
            .set(updates)
            .where(eq(users.id, Number(id)));

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Delete User (Admin only)
router.delete('/users/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting self
        if (req.user!.id === Number(id)) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        await db.delete(users).where(eq(users.id, Number(id)));

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Change Password
router.post('/change-password', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user!.id;

        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

        const validPassword = await comparePassword(currentPassword, user[0].passwordHash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid current password' });
        }

        const hashedPassword = await hashPassword(newPassword);

        await db.update(users)
            .set({ passwordHash: hashedPassword })
            .where(eq(users.id, userId));

        res.json({ message: 'Password updated successfully' });

    } catch (error) {
        res.status(500).json({ error: 'Failed to change password' });
    }
});

export default router;
