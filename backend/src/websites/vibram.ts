import { Status, Item } from "../db";

export async function vibramOpenItems(page: any, item: Item): Promise<Status> {
    try {
        const response = await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        if (response && response.status() === 403) {
            console.log(`[Warning] Vibram blocked the request (403 Forbidden) for ${item.name}`);
            return Status.ERROR;
        }

        // Wait dynamically for the size modal button, failing fast to 5 seconds if out of stock
        await page.waitForSelector('.product-variations__show-size-modal-btn', { timeout: 5000 }).catch(() => {});

        return await vibramCheckItemStock(page, item);
    } catch (error) {
        console.error(`Error checking ${item.name}:`, error);
        return Status.ERROR;
    }
}

// Check if an item is in stock
export async function vibramCheckItemStock(page: any, item: Item): Promise<Status> {
    const content = await page.content();
    const contentLower = content.toLowerCase();

    if (contentLower.includes('access denied') || contentLower.includes('please verify you are a human') || contentLower.includes('press & hold')) {
        console.log(`[Warning] Bot detected on page for ${item.name}`);
        return Status.ERROR;
    }

    try {
        const sizeValue = item.size ? item.size.trim() : null;
        if (!sizeValue) {
            console.log(`[Warning] No size specified for ${item.name}. Vibram requires a size to check stock.`);
            return Status.ERROR;
        }

        // Find the "Select your size" button to open the modal
        const openModalBtn = await page.$('.product-variations__show-size-modal-btn');
        if (!openModalBtn) {
            console.log(`[Warning] Could not find size modal button for ${item.name}. It might be completely out of stock or layout changed.`);
            return Status.OUT_OF_STOCK;
        }

        await openModalBtn.click();
        
        // Wait for the modal or the size span to appear
        const selector = `span[data-attr-value="${sizeValue}"]`;
        await page.waitForSelector(selector, { timeout: 10000 });
        
        const isSelectable = await page.evaluate((sel: string) => {
            const el = document.querySelector(sel);
            if (!el) return false;
            return el.classList.contains('selectable');
        }, selector);

        if (isSelectable) {
            return Status.IN_STOCK;
        } else {
            return Status.OUT_OF_STOCK;
        }
    } catch (e) {
        console.log(`[Warning] Timeout or error interacting with size modal for ${item.name}. Assuming Out of Stock.`);
        return Status.OUT_OF_STOCK;
    }
}
