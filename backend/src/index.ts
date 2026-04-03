import express from 'express';
import cors from 'cors';
import { createRouter } from './routes';
import { Database, Status, Website, Item } from './db';
import { checkStock } from './checker';

async function main() {
    const db = new Database();
    await db.ping();

    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use(createRouter(db));

    app.listen(3001, () => {
        console.log('API Server running on port 3001');
    });

    checkStock(db);
}

main().catch(console.error);
