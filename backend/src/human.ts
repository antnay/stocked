// @ts-nocheck
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// =============================================================================
// 1. HUMAN-LIKE MOUSE MOVEMENT (Bezier curves, not straight lines)
// =============================================================================

function bezierCurve(start, end, steps = 30) {
    // Generate a natural-looking curved path between two points
    // using a randomized cubic bezier with slight overshoot
    const points = [];

    // Random control points to create natural arcs
    const cp1 = {
        x: start.x + (end.x - start.x) * (0.2 + Math.random() * 0.3),
        y: start.y + (Math.random() - 0.5) * 200,
    };
    const cp2 = {
        x: start.x + (end.x - start.x) * (0.5 + Math.random() * 0.3),
        y: end.y + (Math.random() - 0.5) * 200,
    };

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const u = 1 - t;
        points.push({
            x:
                u * u * u * start.x +
                3 * u * u * t * cp1.x +
                3 * u * t * t * cp2.x +
                t * t * t * end.x,
            y:
                u * u * u * start.y +
                3 * u * u * t * cp1.y +
                3 * u * t * t * cp2.y +
                t * t * t * end.y,
        });
    }
    return points;
}

async function humanMove(page, targetX, targetY) {
    const mouse = page.mouse;
    // Get current position (or start from a random spot)
    const startX = 100 + Math.random() * 400;
    const startY = 100 + Math.random() * 300;

    const path = bezierCurve(
        { x: startX, y: startY },
        { x: targetX, y: targetY },
        20 + Math.floor(Math.random() * 20)
    );

    for (const point of path) {
        await mouse.move(point.x, point.y);
        // Variable speed — humans slow down near the target
        const distToEnd = Math.hypot(point.x - targetX, point.y - targetY);
        const delay = distToEnd < 50 ? 15 + Math.random() * 25 : 5 + Math.random() * 12;
        await sleep(delay);
    }
}

// =============================================================================
// 2. HUMAN-LIKE TYPING (variable speed, occasional pauses, typos optional)
// =============================================================================

async function humanType(page, selector, text, { typoRate = 0.03 } = {}) {
    await page.click(selector);
    await sleep(200 + Math.random() * 300);

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        // Occasional typo + backspace
        if (Math.random() < typoRate) {
            const typoChar = String.fromCharCode(char.charCodeAt(0) + (Math.random() > 0.5 ? 1 : -1));
            await page.keyboard.type(typoChar, { delay: 30 + Math.random() * 70 });
            await sleep(100 + Math.random() * 200);
            await page.keyboard.press("Backspace");
            await sleep(50 + Math.random() * 100);
        }

        // Variable typing speed — faster for common letters, slower at word boundaries
        let delay;
        if (char === " ") {
            delay = 80 + Math.random() * 160; // pause between words
        } else if ("aeiou".includes(char.toLowerCase())) {
            delay = 30 + Math.random() * 50; // vowels are fast
        } else {
            delay = 50 + Math.random() * 90;
        }

        await page.keyboard.type(char, { delay });

        // Occasional mid-word pause (like thinking)
        if (Math.random() < 0.05) {
            await sleep(300 + Math.random() * 500);
        }
    }
}

// =============================================================================
// 3. HUMAN-LIKE SCROLLING (variable speed, occasional direction changes)
// =============================================================================

async function humanScroll(page, totalDistance = 800) {
    let scrolled = 0;
    const direction = totalDistance > 0 ? 1 : -1;
    const absTotal = Math.abs(totalDistance);

    while (scrolled < absTotal) {
        // Variable chunk sizes like a real scroll wheel
        const chunk = (30 + Math.random() * 120) * direction;
        await page.mouse.wheel({ deltaY: chunk });
        scrolled += Math.abs(chunk);

        // Variable delay between scroll events
        await sleep(20 + Math.random() * 80);

        // Occasionally pause mid-scroll (reading something)
        if (Math.random() < 0.1) {
            await sleep(500 + Math.random() * 2000);
        }

        // Very rarely scroll back slightly (overshoot correction)
        if (Math.random() < 0.05) {
            await page.mouse.wheel({ deltaY: -chunk * 0.3 });
            await sleep(100 + Math.random() * 200);
        }
    }
}

// =============================================================================
// 4. REALISTIC BROWSER FINGERPRINT SETUP
// =============================================================================

async function launchBrowser() {
    const viewports = [
        { width: 1920, height: 1080 },
        { width: 1536, height: 864 },
        { width: 1440, height: 900 },
        { width: 1366, height: 768 },
        { width: 2560, height: 1440 },
    ];

    const viewport = viewports[Math.floor(Math.random() * viewports.length)];

    const browser = await puppeteer.launch({
        headless: false, // Use headed mode — headless is easier to detect
        args: [
            `--window-size=${viewport.width},${viewport.height}`,
            "--disable-blink-features=AutomationControlled",
            "--no-first-run",
            "--no-default-browser-check",
            // Realistic Chrome flags
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-hang-monitor",
            "--lang=en-US,en",
        ],
    });

    const page = await browser.newPage();

    // Set realistic viewport
    await page.setViewport({
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: Math.random() > 0.5 ? 1 : 2,
    });

    // Override navigator properties that leak automation
    await page.evaluateOnNewDocument(() => {
        // Realistic plugins array
        Object.defineProperty(navigator, "plugins", {
            get: () => [
                { name: "Chrome PDF Plugin", filename: "internal-pdf-viewer" },
                { name: "Chrome PDF Viewer", filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai" },
                { name: "Native Client", filename: "internal-nacl-plugin" },
            ],
        });

        // Realistic language settings
        Object.defineProperty(navigator, "languages", {
            get: () => ["en-US", "en"],
        });

        // Hide webdriver flag
        Object.defineProperty(navigator, "webdriver", {
            get: () => undefined,
        });

        // Realistic hardware concurrency
        Object.defineProperty(navigator, "hardwareConcurrency", {
            get: () => [4, 8, 12, 16][Math.floor(Math.random() * 4)],
        });

        // Add realistic WebGL renderer
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function (param) {
            if (param === 37445) return "Intel Inc.";
            if (param === 37446) return "Intel Iris OpenGL Engine";
            return getParameter.call(this, param);
        };

        // Fake permissions API
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (params) =>
            params.name === "notifications"
                ? Promise.resolve({ state: Notification.permission })
                : originalQuery(params);

        // Chrome-specific properties
        window.chrome = {
            runtime: {},
            loadTimes: function () { },
            csi: function () { },
        };
    });

    // Set realistic user agent
    const userAgent = await page.evaluate(() => navigator.userAgent);
    await page.setUserAgent(userAgent.replace("HeadlessChrome", "Chrome"));

    return { browser, page };
}

// =============================================================================
// 5. BEHAVIORAL PATTERNS (idle time, tab focus, reading simulation)
// =============================================================================

async function simulateReading(page, minMs = 2000, maxMs = 8000) {
    // Simulate a human reading a page — small mouse movements + idle time
    const duration = minMs + Math.random() * (maxMs - minMs);
    const start = Date.now();

    while (Date.now() - start < duration) {
        // Small idle mouse jiggles
        const jiggleX = 400 + Math.random() * 600;
        const jiggleY = 200 + Math.random() * 400;
        await page.mouse.move(
            jiggleX + (Math.random() - 0.5) * 20,
            jiggleY + (Math.random() - 0.5) * 20
        );
        await sleep(300 + Math.random() * 800);
    }
}

async function simulateBrowsingPattern(page) {
    // Mimic a real user: scroll, read, move mouse, maybe hover on items
    await simulateReading(page, 1000, 3000);
    await humanScroll(page, 300 + Math.random() * 500);
    await simulateReading(page, 2000, 5000);
    await humanScroll(page, 200 + Math.random() * 300);
}
