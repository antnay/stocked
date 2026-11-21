import pg from "pg";
import "dotenv/config";

export enum Status {
    IN_STOCK = "in_stock",
    OUT_OF_STOCK = "out_of_stock",
    ERROR = "error"
}

export enum Website {
    TARGET = "target",
    VIBRAM = "vibram",
    AMAZON = "amazon",
    RHODE = "rhode",
    GOODCHA = "goodcha"
}

export class Database {
    private pool: pg.Pool;

    constructor() {
        console.log("DB config:", {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        this.pool = new pg.Pool({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || "5432"),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });
    }

    async ping(): Promise<boolean> {
        try {
            await this.pool.query("SELECT 1");
            console.log("Connected to database");
            return true;
        } catch (error) {
            console.error("Failed to connect to database", error);
            throw new Error("Failed to connect to database");
        }
    }

    async addItem(url: string, name: string, website: Website, size: string | null, status: Status, checkIntervalSeconds: number) {
        const res = await this.pool.query("INSERT INTO items (url, name, website, size, last_status, check_interval_seconds) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *", [url, name, website, size, status, checkIntervalSeconds]);
        return res.rows[0];
    }

    async updateItemInterval(itemId: number, checkIntervalSeconds: number) {
        const res = await this.pool.query("UPDATE items SET check_interval_seconds = $1 WHERE id = $2 RETURNING *", [checkIntervalSeconds, itemId]);
        return res.rows[0];
    }

    async markItemChecked(itemId: number) {
        await this.pool.query("UPDATE items SET last_checked_at = now() WHERE id = $1", [itemId]);
    }

    async getItems() {
        const res = await this.pool.query("SELECT url, name, last_status FROM items");
        return res.rows;
    }

    async deleteItem(itemId: number) {
        const res = await this.pool.query("DELETE FROM items WHERE id = $1", [itemId]);
        return res.rows[0];
    }

    async updateItemStatus(itemId: number, status: Status) {
        const res = await this.pool.query("UPDATE items SET last_status = $1 WHERE id = $2", [status, itemId]);
        return res.rows;
    }

    async getItemStatus(itemId: number) {
        const res = await this.pool.query("SELECT last_status FROM items WHERE id = $1", [itemId]);
        return res.rows[0].last_status;
    }

    async addUser(email: string) {
        const res = await this.pool.query("INSERT INTO \"user\" (email) VALUES ($1) RETURNING *", [email]);
        return res.rows[0];
    }

    async getUser(email: string) {
        const res = await this.pool.query("SELECT * FROM \"user\" WHERE email = $1", [email]);
        return res.rows[0];
    }

    async getAllUsers() {
        const res = await this.pool.query("SELECT * FROM \"user\"");
        return res.rows;
    }

    async addUserItem(userId: number, itemId: number) {
        const res = await this.pool.query("INSERT INTO user_items (user_id, item_id) VALUES ($1, $2) RETURNING *", [userId, itemId]);
        return res.rows[0];
    }

    async getUserItems(userId: number) {
        const res = await this.pool.query("SELECT * FROM user_items WHERE user_id = $1", [userId]);
        return res.rows;
    }

    async deleteUserItem(userId: number, itemId: number) {
        const res = await this.pool.query("DELETE FROM user_items WHERE user_id = $1 AND item_id = $2", [userId, itemId]);
        return res.rows[0];
    }

    async getItemsByUser(userId: number) {
        const res = await this.pool.query("SELECT * FROM items WHERE id IN (SELECT item_id FROM user_items WHERE user_id = $1)", [userId]);
        return res.rows;
    }

    async getAllItemsAndUsers() {
        const res = await this.pool.query("SELECT items.*, user_items.user_id, \"user\".email FROM items JOIN user_items ON items.id = user_items.item_id JOIN \"user\" ON user_items.user_id = \"user\".id");
        return res.rows;
    }

    async getDueItemsAndUsers() {
        const res = await this.pool.query("SELECT items.*, user_items.user_id, \"user\".email FROM items JOIN user_items ON items.id = user_items.item_id JOIN \"user\" ON user_items.user_id = \"user\".id WHERE items.last_checked_at IS NULL OR items.last_checked_at <= now() - (items.check_interval_seconds * interval '1 second')");
        return res.rows;
    }

}

export interface Item {
    id: number;
    url: string;
    name: string;
    website: Website;
    size: string | null;
    lastStatus: Status;
    checkIntervalSeconds: number;
    lastCheckedAt: Date | null;
    createdAt: Date;
}

export interface User {
    id: number;
    email: string;
}

export interface UserItem {
    userId: number;
    itemId: number;
    checkout: boolean;
}

export interface ItemsByUser {
    userId: number;
    items: Item[];
}

export interface AllItemsAndUsers {
    id: number;
    url: string;
    name: string;
    website: Website;
    lastStatus: Status;
    createdAt: Date;
    users: User[];
}

export interface Config {
    interval: number;
    resendApiKey: string;
    emailFrom: string;
}

