
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Resend } from 'resend';

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

interface Item {
    url: string;
    name: string;
    lastStatus?: 'in_stock' | 'out_of_stock' | 'error';
}

interface Config {
    checkIntervalSeconds?: number;
    resendApiKey: string;
    emailFrom: string;
    emailTo: string;
    items: Item[];
}

const CONFIG_PATH = path.resolve(__dirname, '../config/config.json');

// Helper to Load Config
function loadConfig(): Config {
    if (!fs.existsSync(CONFIG_PATH)) {
        console.error(`Config file not found at ${CONFIG_PATH}`);
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

// Check if an item is in stock
async function checkItemStock(browser: any, item: Item): Promise<'in_stock' | 'out_of_stock' | 'error'> {
    const page = await browser.newPage();
    try {
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log(`Checking stock for: ${item.name}`);
        const response = await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Check for bot protection blocks based on response status
        if (response && response.status() === 403) {
            console.log(`[Warning] Target blocked the request (403 Forbidden) for ${item.name}`);
            return 'error';
        }

        // Target dynamically loads pricing and stock. Wait a little bit extra for JS to render.
        // Waiting for the main main layout or buttons to render.
        await new Promise(r => setTimeout(r, 8000));

        const content = await page.content();
        const contentLower = content.toLowerCase();

        // Check for bot block in content
        if (contentLower.includes('access denied') || contentLower.includes('please verify you are a human') || contentLower.includes('press & hold')) {
            console.log(`[Warning] Bot detected on page for ${item.name}`);
            return 'error';
        }

        // Extract product ID from URL to find the exact button (e.g., -/A-95093982)
        const productIdMatch = item.url.match(/-\/A-(\d+)/);
        const productId = productIdMatch ? productIdMatch[1] : null;

        const isAddToCartButton = await page.evaluate((pid: string | null) => {
            if (pid) {
                // Check the primary product button by its ID
                const exactButton = document.querySelector(`button#addToCartButtonOrTextIdFor${pid}`) as HTMLButtonElement;
                if (exactButton && !exactButton.disabled) {
                    return true;
                }
                if (exactButton && exactButton.disabled) {
                    return false; // Safely know it's disabled/out of stock
                }
            }

            // Fallback: look for other primary fulfillment buttons, but ensure they are not disabled
            // and try to avoid 'chooseOptionsButton' which is typically for recommended carousel items.
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.some(b => {
                if (b.disabled) return false;

                const dataTest = b.getAttribute('data-test')?.toLowerCase() || '';
                if (dataTest.includes('chooseoptions')) return false; // skip recommendations

                const text = b.textContent?.toLowerCase() || '';
                const ariaLabel = b.getAttribute('aria-label')?.toLowerCase() || '';

                return text.includes('add to cart') ||
                    ariaLabel.includes('add to cart') ||
                    dataTest.includes('addtocart') ||
                    dataTest.includes('shippingbutton') ||
                    text.includes('ship it');
            });
        }, productId);

        if (isAddToCartButton) {
            return 'in_stock';
        }

        // If 'out of stock' text is on the page, or the item is discontinued
        const isOutOfStockText = contentLower.includes('out of stock') ||
            contentLower.includes('not available') ||
            contentLower.includes('sold out');

        if (isOutOfStockText) {
            return 'out_of_stock';
        }

        // If no explicit signal is found, assume out of stock but log the situation
        console.log(`[Warning] Neither in-stock nor out-of-stock explicitly detected for ${item.name}. Defaulting to out_of_stock.`);
        return 'out_of_stock';
    } catch (error) {
        console.error(`Error checking ${item.name}:`, error);
        return 'error';
    } finally {
        await page.close();
    }
}

async function sendNotification(config: Config, item: Item) {
    const resend = new Resend(config.resendApiKey);

    try {
        const { data, error } = await resend.emails.send({
            from: config.emailFrom,
            to: config.emailTo,
            subject: `In Stock: ${item.name}`,
            html: `
        <h1>Item Back in Stock!</h1>
        <p><strong>${item.name}</strong> is now available.</p>
        <p><a href="${item.url}">Buy Now at Target</a></p>
      `
        });

        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent successfully:', data);
        }
    } catch (err) {
        console.error('Exception sending email:', err);
    }
}

async function main() {
    const config = loadConfig();
    const checkInterval = (config.checkIntervalSeconds || 300) * 1000;

    // Keep track of previous statuses to avoid spamming
    const STATUS_FILE = path.resolve(__dirname, '../config/status.json');
    let itemStatuses: Record<string, 'in_stock' | 'out_of_stock' | 'error'> = {};

    if (fs.existsSync(STATUS_FILE)) {
        try {
            itemStatuses = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
            console.log('Loaded previous statuses:', itemStatuses);
        } catch (e) {
            console.error('Failed to load status file:', e);
        }
    }

    console.log(`Tracking ${config.items.length} items. Check interval: ${config.checkIntervalSeconds}s`);

    while (true) {
        // Reload config each loop...
        let currentConfig: Config;
        try {
            currentConfig = loadConfig();
        } catch (e) {
            console.error("Failed to reload config, using previous config", e);
            currentConfig = config;
        }

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        for (const item of currentConfig.items) {
            const status = await checkItemStock(browser, item);
            console.log(`Status for ${item.name}: ${status}`);

            const prevStatus = itemStatuses[item.url];

            if (status === 'in_stock' && prevStatus !== 'in_stock') {
                console.log(`!!! ${item.name} IS IN STOCK !!! Sending notification...`);
                await sendNotification(currentConfig, item);
                // Update status immediately and save
                itemStatuses[item.url] = status;
                fs.writeFileSync(STATUS_FILE, JSON.stringify(itemStatuses, null, 2));
            } else if (status !== 'error') {
                // Only update status if it's a valid check (not error)
                // If it was in_stock and now out_of_stock, update it.
                // If it was out_of_stock and still out_of_stock, update it (no change).
                if (itemStatuses[item.url] !== status) {
                    itemStatuses[item.url] = status;
                    fs.writeFileSync(STATUS_FILE, JSON.stringify(itemStatuses, null, 2));
                }
            } else {
                console.log(`Skipping status update for ${item.name} due to error.`);
            }

            // Small delay between items to be nice
            await new Promise(r => setTimeout(r, 5000));
        }

        await browser.close();

        console.log(`Cycle complete. Waiting ${checkInterval / 1000} seconds...`);
        await new Promise(r => setTimeout(r, checkInterval));
    }
}

main().catch(console.error);
