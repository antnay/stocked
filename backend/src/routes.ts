import { Database, Status } from "./db";
import { Router } from "express";

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
            const { userId, url, name, website, size } = req.body;
            const item = await db.addItem(url, name, website, size || null, Status.OUT_OF_STOCK);
            await db.addUserItem(userId, item.id);
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
