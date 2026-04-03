import { Status, Item } from "../db";

export async function amazonOpenItems(page: any, item: Item): Promise<Status> {
    try {
        await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 60000 });
        // const response = await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        try {
            const buttons = await page.$$('button, input[type="submit"], a');
            let continueBtn = null;

            for (const btn of buttons) {
                const text = await btn.evaluate((node: any) => (node as HTMLElement).innerText).catch(() => '');
                const alt = await btn.evaluate((node: any) => (node as HTMLElement).getAttribute('alt')).catch(() => '');
                if (
                    (text && text.toLowerCase().includes('continue shopping')) ||
                    (alt && alt.toLowerCase().includes('continue shopping'))
                ) {
                    continueBtn = btn;
                    break;
                }
            }

            if (continueBtn) {
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch((e: Error) => console.log("Navigation wait warning:", e.message)),
                    continueBtn.click()
                ]);
            }
        } catch (e) {
            console.log("Error handling interstitial:", e);
        }

        try {
            await page.waitForSelector('#productTitle', { timeout: 10000 });
        } catch (e) {
            try {
                const title = await page.title();
                console.warn(`Timeout waiting for #productTitle. Page title: "${title}". Page might be a CAPTCHA or failed to load.`);
            } catch (titleError) {
                console.warn(`Timeout waiting for #productTitle. Could not get page title (possibly detached):`, titleError);
            }
        }

        const addToCartButton = await page.$('#add-to-cart-button');
        const buyNowButton = await page.$('#buy-now-button');
        const availabilityDiv = await page.$('#availability');

        let isAvailable = false;

        if (addToCartButton || buyNowButton) {
            isAvailable = true;
        }

        if (availabilityDiv) {
            const text = await page.evaluate((el: any) => el.innerText, availabilityDiv);
            if (text.toLowerCase().includes('currently unavailable') || text.toLowerCase().includes('out of stock')) {
                isAvailable = false;
            }
        }

        return isAvailable ? Status.IN_STOCK : Status.OUT_OF_STOCK;
    } catch (error) {
        console.error(`Error checking ${item.name}:`, error);
        return Status.ERROR;
    } finally {
        await page.close();
    }
}