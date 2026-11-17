import fs from 'fs';
import path from 'path';
import { Config } from './db';

const CONFIG_PATH = path.resolve(__dirname, '../config/config.json');

export function loadConfig(): Config {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    return {
        interval: raw.checkIntervalSeconds ?? 300,
        resendApiKey: raw.resendApiKey,
        emailFrom: raw.emailFrom,
    };
}
