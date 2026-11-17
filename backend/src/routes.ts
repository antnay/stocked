import { Database, Status } from "./db";
import { Router } from "express";

// Returns a valid positive-integer interval in seconds, a default when omitted,
// or null when the supplied value is invalid.
function normalizeInterval(value: unknown): number | null {
    if (value === undefined || value === null || value === "") {
        return 300;
    }
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1) {
        return null;
    }
    return n;
}

export function createRouter(db: Database) {
    const router = Router();

    router.get('/api/users', async (req, res) => {
        try {
            const users = await db.getAllUsers();
            res.json(users);
        } catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });

    router.post('/api/users', async (req, res) => {
        try {
            const { email } = req.body;
            let user = await db.getUser(email);
            if (!user) {
                user = await db.addUser(email);
            }
            res.json(user);
        } catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });

    router.get('/api/items', async (req, res) => {
        try {
            const items = await db.getAllItemsAndUsers();
            res.json(items);
        } catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });

    router.delete('/api/items/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const item = await db.deleteItem(parseInt(id));
            res.json(item);
        } catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });

    router.post('/api/items', async (req, res) => {
        try {
            const { userId, url, name, website, size, checkIntervalSeconds } = req.body;
            const interval = normalizeInterval(checkIntervalSeconds);
            if (interval === null) {
                return res.status(400).json({ error: "checkIntervalSeconds must be a positive integer" });
            }
            const item = await db.addItem(url, name, website, size || null, Status.OUT_OF_STOCK, interval);
            await db.addUserItem(userId, item.id);
            res.json(item);
        } catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });

    router.patch('/api/items/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const interval = normalizeInterval(req.body.checkIntervalSeconds);
            if (interval === null) {
                return res.status(400).json({ error: "checkIntervalSeconds must be a positive integer" });
            }
            const item = await db.updateItemInterval(parseInt(id), interval);
            res.json(item);
        } catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });

    router.delete('/api/user-items', async (req, res) => {
        try {
            const { userId, itemId } = req.body;
            const userItem = await db.deleteUserItem(userId, itemId);
            res.json(userItem);
        } catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });

    router.post('/api/user-items', async (req, res) => {
        try {
            const { userId, itemId } = req.body;
            const userItem = await db.addUserItem(userId, itemId);
            res.json(userItem);
        } catch (e) {
            res.status(500).json({ error: String(e) });
        }
    });

    return router;
}
