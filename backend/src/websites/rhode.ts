import { Status, Item } from "../db";
import { shopifyOpenItems } from "./shopify";

// Rhode runs on Shopify, so we reuse the generic Shopify product-JSON scraper.
export async function rhodeOpenItems(page: any, item: Item): Promise<Status> {
    return shopifyOpenItems(page, item);
}
