import { Status, Item } from "../db";
import { shopifyOpenItems } from "./shopify";

// GOOD CHĀ (good-cha.com) runs on Shopify, so we reuse the generic Shopify
// product-JSON scraper.
export async function goodchaOpenItems(page: any, item: Item): Promise<Status> {
    return shopifyOpenItems(page, item);
}
