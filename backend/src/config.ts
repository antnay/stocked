import fs from 'fs';
import path from 'path';
import { Config } from './db';

const CONFIG_PATH = path.resolve(__dirname, '../config/config.json');

export function loadConfig(): Config {
    let contents: string;
    try {
        contents = fs.readFileSync(CONFIG_PATH, 'utf-8');
    } catch (e: any) {
        if (e && e.code === 'ENOENT') {
            throw new Error(
                `Config file not found at ${CONFIG_PATH}. ` +
                `Create it by copying backend/config/config.json.sample to backend/config/config.json, ` +
                `then set your Resend API key (resendApiKey) and verified sender address (emailFrom). ` +
                `This file is gitignored, so it won't arrive via 'git pull' — create it on the host.`
            );
        }
        throw e;
    }

    let raw: any;
    try {
        raw = JSON.parse(contents);
    } catch (e) {
        throw new Error(`Config file at ${CONFIG_PATH} is not valid JSON: ${String(e)}`);
    }

    if (!raw.resendApiKey || !raw.emailFrom) {
        throw new Error(
            `Config file at ${CONFIG_PATH} is missing required fields. ` +
            `Both 'resendApiKey' and 'emailFrom' must be set (see config.json.sample).`
        );
    }

    return {
        interval: raw.checkIntervalSeconds ?? 300,
        resendApiKey: raw.resendApiKey,
        emailFrom: raw.emailFrom,
    };
}
