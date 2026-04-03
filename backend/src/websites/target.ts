import { Status, Item } from "../db";

export async function targetOpenItems(page: any, item: Item): Promise<Status> {
    try {
        const response = await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        if (response && response.status() === 403) {
            console.log(`[Warning] Target blocked the request (403 Forbidden) for ${item.name}`);
            return Status.ERROR;
        }

        // Dynamically wait for the add to cart button to load, failing fast to 5 seconds if out of stock
        const productIdMatch = item.url.match(/-\/A-(\d+)/);
        const productId = productIdMatch ? productIdMatch[1] : null;
        if (productId) {
            await page.waitForSelector(`button#addToCartButtonOrTextIdFor${productId}`, { timeout: 5000 }).catch(() => {});
        } else {
            await page.waitForSelector('button', { timeout: 5000 }).catch(() => {});
        }

        return await targetCheckItemStock(page, item);
    } catch (error) {
        console.error(`Error checking ${item.name}:`, error);
        return Status.ERROR;
    }
}

// Check if an item is in stock
export async function targetCheckItemStock(page: any, item: Item): Promise<Status> {
    // Extract product ID from URL to find the exact button (e.g., -/A-95093982)
    const productIdMatch = item.url.match(/-\/A-(\d+)/);
    const productId = productIdMatch ? productIdMatch[1] : null;

    const buttonState = await page.evaluate((pid: string | null) => {
        if (pid) {
            // Check the primary product button by its ID
            const exactButton = document.querySelector(`button#addToCartButtonOrTextIdFor${pid}`) as HTMLButtonElement;
            if (exactButton) {
                return exactButton.disabled ? 'out_of_stock' : 'in_stock';
            }
        }

        // Fallback: look for other primary fulfillment buttons
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const b of buttons) {
            const dataTest = b.getAttribute('data-test')?.toLowerCase() || '';
            if (dataTest.includes('chooseoptions')) continue;

            const text = b.textContent?.toLowerCase() || '';
            const ariaLabel = b.getAttribute('aria-label')?.toLowerCase() || '';

            const isCartBtn = text.includes('add to cart') ||
                ariaLabel.includes('add to cart') ||
                dataTest.includes('addtocart') ||
                dataTest.includes('shippingbutton') ||
                text.includes('ship it');

            if (isCartBtn) {
                return b.disabled ? 'out_of_stock' : 'in_stock';
            }
        }
        
        return 'unknown';
    }, productId);

    if (buttonState === 'in_stock') return Status.IN_STOCK;
    if (buttonState === 'out_of_stock') {
        // Fast early skip skipping the gigantic HTML blob extract
        return Status.OUT_OF_STOCK;
    }

    // Fallback: read the entire DOM body text to search for textual cues or bot bans
    const content = await page.content();
    const contentLower = content.toLowerCase();

    if (contentLower.includes('access denied') || contentLower.includes('please verify you are a human') || contentLower.includes('press & hold')) {
        console.log(`[Warning] Bot detected on page for ${item.name}`);
        return Status.ERROR;
    }

    const isOutOfStockText = contentLower.includes('out of stock') ||
        contentLower.includes('not available') ||
        contentLower.includes('sold out');

    if (isOutOfStockText) {
        return Status.OUT_OF_STOCK;
    }

    console.log(`[Warning] Neither in-stock nor out-of-stock explicitly detected for ${item.name}. Defaulting to out_of_stock.`);
    return Status.OUT_OF_STOCK;
}
