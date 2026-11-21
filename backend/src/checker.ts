import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Database, Website, Status, Item, Config } from './db';
import { amazonOpenItems } from './websites/amazon';
import { targetOpenItems } from './websites/target';
import { vibramOpenItems } from './websites/vibram';
import { rhodeOpenItems } from './websites/rhode';
import { goodchaOpenItems } from './websites/goodcha';
import { sendNotification } from './helpers';
import { loadConfig } from './config';
import { exit } from 'node:process';

puppeteer.use(StealthPlugin());

const scrapers = {
    [Website.TARGET]: targetOpenItems,
    [Website.VIBRAM]: vibramOpenItems,
    [Website.AMAZON]: amazonOpenItems,
    [Website.RHODE]: rhodeOpenItems,
    [Website.GOODCHA]: goodchaOpenItems,
};

export async function checkStock(db: Database) {
    while (true) {
        let currentConfig: Config;
        try {
            currentConfig = loadConfig();
        } catch (e) {
            console.error("Failed to reload config", e);
            exit(1);
        }
        // Base poll cadence: how often we wake to look for items whose own
        // per-item interval is due. Per-item intervals are respected at this granularity.
        const baseTick = (currentConfig.interval || 60) * 1000;
        const allItemsAndUsers = await db.getDueItemsAndUsers();

        // Group items by unique id, collecting all attached emails
        const itemMap = new Map<number, Item & { emails: string[]; }>();
        for (const data of allItemsAndUsers) {
            if (!itemMap.has(data.id)) {
                // Initialize the unique item with an empty emails array
                itemMap.set(data.id, { ...data, emails: [] });
            }
            if (data.email) {
                const groupedItem = itemMap.get(data.id)!;
                if (!groupedItem.emails.includes(data.email)) {
                    groupedItem.emails.push(data.email);
                }
            }
        }
        const uniqueItems = Array.from(itemMap.values());

        // Nothing is due this tick: skip the (expensive) browser launch and wait.
        if (uniqueItems.length === 0) {
            await new Promise(r => setTimeout(r, baseTick));
            continue;
        }

        // console.log(`Checking stock for ${uniqueItems.length} unique items...`);

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        let page: any;
        const initPage = async () => {
            if (page) await page.close().catch(() => { });
            page = await browser.newPage();
            await page.setViewport({ width: 1366, height: 768 });
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        };
        await initPage();

        for (const item of uniqueItems) {
            const scraper = scrapers[item.website as keyof typeof scrapers];
            if (!scraper) {
                continue;
            }

            const prevStatus: Status = (item as any).last_status as Status;

            let status = Status.ERROR;
            try {
                status = await scraper(page, item);
            } catch (e) {
                status = Status.ERROR;
            }

            console.log(`${item.name}: ${status}`);

            if (status === Status.IN_STOCK && prevStatus !== Status.IN_STOCK) {
                // console.log(`!!! ${item.name} IS IN STOCK !!! Sending notifications...`);
                for (const email of item.emails) {
                    console.log(` -> Emailing ${email}...`);
                    await sendNotification(email, item, currentConfig);
                }
                await db.updateItemStatus(item.id, status);
            } else if (status !== Status.ERROR) {
                if (prevStatus !== status) {
                    await db.updateItemStatus(item.id, status);
                }
            } else {
                // console.log(`Skipping status update for ${item.name} due to error.`);
                // console.log(`Recreating browser frame to ensure clean state for next item...`);
                await initPage();
            }

            // Record the check so this item isn't re-checked until its own interval elapses.
            await db.markItemChecked(item.id);

            await new Promise(r => setTimeout(r, 100));
        }

        await browser.close();

        // console.log(`Cycle complete. Waiting ${baseTick / 1000} seconds...`);
        await new Promise(r => setTimeout(r, baseTick));
    }
}
