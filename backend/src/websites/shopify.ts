import { Status, Item } from "../db";

// Generic Shopify scraper. Shopify stores expose a `/products/<handle>.js` JSON
// endpoint with reliable availability info, so we hit that instead of scraping
// the DOM. Works for any Shopify-hosted storefront (Rhode, GOOD CHĀ, etc.).
export async function shopifyOpenItems(page: any, item: Item): Promise<Status> {
    try {
        // Strip any query string / hash and append `.js` to reach the product JSON
        const baseUrl = item.url.split(/[?#]/)[0].replace(/\/$/, '');
        const jsonUrl = `${baseUrl}.js`;

        const response = await page.goto(jsonUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        if (response && response.status() === 403) {
            console.log(`[Warning] Shopify blocked the request (403 Forbidden) for ${item.name}`);
            return Status.ERROR;
        }

        if (response && response.status() === 404) {
            console.log(`[Warning] Shopify product not found (404) for ${item.name}`);
            return Status.ERROR;
        }

        return await shopifyCheckItemStock(page, item);
    } catch (error) {
        console.error(`Error checking ${item.name}:`, error);
        return Status.ERROR;
    }
}

// Check if an item is in stock
export async function shopifyCheckItemStock(page: any, item: Item): Promise<Status> {
    const content = await page.content();

    const contentLower = content.toLowerCase();
    if (contentLower.includes('access denied') || contentLower.includes('please verify you are a human') || contentLower.includes('press & hold')) {
        console.log(`[Warning] Bot detected on page for ${item.name}`);
        return Status.ERROR;
    }

    // The JSON is rendered inside the page body; extract the raw text and parse it.
    let text = await page.evaluate(() => document.body ? document.body.innerText : '');
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) {
        console.log(`[Warning] Could not locate product JSON for ${item.name}.`);
        return Status.ERROR;
    }

    let product: any;
    try {
        product = JSON.parse(text.slice(start, end + 1));
    } catch (e) {
        console.log(`[Warning] Failed to parse product JSON for ${item.name}.`);
        return Status.ERROR;
    }

    const variants: any[] = Array.isArray(product.variants) ? product.variants : [];
    const sizeValue = item.size ? item.size.trim().toLowerCase() : null;

    // If a size (variant) is specified, check that specific variant's availability.
    if (sizeValue) {
        const variant = variants.find(v => {
            const title = (v.public_title || v.title || '').toString().trim().toLowerCase();
            const option1 = (v.option1 || '').toString().trim().toLowerCase();
            return title === sizeValue || option1 === sizeValue;
        });

        if (!variant) {
            console.log(`[Warning] Variant "${item.size}" not found for ${item.name}.`);
            return Status.OUT_OF_STOCK;
        }

        return variant.available ? Status.IN_STOCK : Status.OUT_OF_STOCK;
    }

    // No size specified: in stock if the product (any variant) is available.
    return product.available ? Status.IN_STOCK : Status.OUT_OF_STOCK;
}
