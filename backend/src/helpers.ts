import fs from 'fs';
import path from 'path';
import { Item } from './db';
import { Resend } from 'resend';

export interface Config {
    checkIntervalSeconds?: number;
    resendApiKey: string;
    emailFrom: string;
    emailTo: string[];
    items: Item[];
}

const CONFIG_PATH = path.resolve(__dirname, '../config/config.json');
const config = loadConfig();

export function loadConfig(): Config {
    if (!fs.existsSync(CONFIG_PATH)) {
        console.error(`Config file not found at ${CONFIG_PATH}`);
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

export async function sendNotification(to: string, item: Item) {
    const resend = new Resend(config.resendApiKey);

    try {
        const { data, error } = await resend.emails.send({
            from: config.emailFrom,
            to: to,
            subject: `item in stock: ${item.name} 😍🥰😘🤪😻😯♗∞😍`,
            html: `
        <h1>Item Back in Stock!</h1>
        <p><strong>${item.name}</strong> is IN STOCK!!!</p>
        <p><a href="${item.url}">BUY NOW ON ${item.website}</a></p>
        <p>⠀⠀⠀⠀⢀⣤⠤⣄⠀⠀⠀⠀⣠⠤⣄⠀⠀⠀
           ⠀⠀⠀⢠⠞⠀⠀⠈⢷⠀⠀⡜⠃⠀⠈⢳⠀⠀
           ⠀⠀⠀⣾⠀⠀⠀⠀⠘⡇⢰⠅⠀⠀⠀⠸⡇⠀
           ⠀⠀⠀⣿⠀⠀⠀⠀⠀⡇⣾⠀⠀⠀⠀⢸⠃⠀
           ⠀⠀⠀⢹⡀⠀⠀⠀⠀⡇⣿⠀⠀⠀⠀⡾⠀⠀
           ⠀⠀⠀⠸⡇⠀⠀⠀⠀⠷⠿⠀⠀⠀⢰⠇⠀⠀
           ⠀⢀⡴⠛⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢶⡀⠀
           ⢰⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⡄
           ⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣷
           ⢹⠀⠀⠀⢰⡆⠀⠀⠀⠀⠀⠀⢀⣄⠀⠀⠀⡟
           ⠈⢧⡀⠀⠀⠀⠀⠀⢄⡀⣀⠀⠀⠁⠀⠀⣸⠃
           ⠀⠈⠻⢦⣀⠀⠀⠀⠚⠙⠂⠀⠀⠀⣀⡴⠋⠀
           ⠀⠀⠀⠀⠈⠉⠓⠒⠲⠶⠶⠒⠒⠋⠁⠀⠀⠀
</p>
      `
        });

        if (error) {
            console.error('Error sending email:', error);
        } else {
            // console.log('Email sent successfully:', data);
        }
    } catch (err) {
        console.error('Exception sending email:', err);
    }
}