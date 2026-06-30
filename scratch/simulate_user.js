import { chromium } from 'playwright';

const ARTIFACT_DIR = "/Users/chuchu/.gemini/antigravity/brain/d57bcb40-4a84-4e55-8a24-0d05a1bcda83";

async function main() {
  console.log("Launching headless browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  
  // Log browser console logs
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Browser Error]: ${msg.text()}`);
    }
  });

  try {
    // ── Step 1: Browse Encyclopedia Home ──
    console.log("Visiting Encyclopedia...");
    await page.goto("https://aquaguide-frontend.pages.dev/encyclopedia#browse");
    await page.waitForTimeout(3000); // wait for initial render
    await page.screenshot({ path: `${ARTIFACT_DIR}/step1_encyclopedia_home.png` });
    console.log("Saved step1_encyclopedia_home.png");

    // ── Step 2: Search for Platinum species ──
    console.log("Searching for '白金'...");
    const searchInput = page.getByPlaceholder("搜索鱼、虾、螺、水草或用途");
    await searchInput.fill("白金");
    await searchInput.press("Enter");
    await page.waitForTimeout(2000); // wait for search filter to update
    await page.screenshot({ path: `${ARTIFACT_DIR}/step2_search_platinum.png` });
    console.log("Saved step2_search_platinum.png");

    // ── Step 3: Open Species Detail Dialog ──
    console.log("Opening detail dialog for first search result...");
    const firstCard = page.locator("[data-species-card-image-area]").first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForTimeout(2000); // wait for modal transition
      await page.screenshot({ path: `${ARTIFACT_DIR}/step3_species_detail.png` });
      console.log("Saved step3_species_detail.png");
      
      // Close dialog by clicking close button or pressing Escape
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    } else {
      console.log("Warning: First card not found or not visible");
    }

    // ── Step 4: Open Compatibility Calculator ──
    console.log("Navigating to Compatibility Calculator...");
    await page.goto("https://aquaguide-frontend.pages.dev/encyclopedia#compatibility");
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${ARTIFACT_DIR}/step4_compatibility_calculator.png` });
    console.log("Saved step4_compatibility_calculator.png");

    // ── Step 5: Add species and calculate ──
    console.log("Adding species to calculator...");
    const calcSearch = page.getByPlaceholder("搜索并加入要混养的生物");
    if (await calcSearch.isVisible()) {
      // Search and add '白金红鼻'
      await calcSearch.fill("白金红鼻");
      await page.waitForTimeout(1500);
      const addButton1 = page.locator("button:has-text('加入')").first();
      if (await addButton1.isVisible()) {
        await addButton1.click();
        console.log("Added 白金红鼻");
      }
      
      // Search and add '黑壳虾'
      await calcSearch.fill("黑壳虾");
      await page.waitForTimeout(1500);
      const addButton2 = page.locator("button:has-text('加入')").first();
      if (await addButton2.isVisible()) {
        await addButton2.click();
        console.log("Added 黑壳虾");
      }
      
      await page.waitForTimeout(3000); // wait for calculations to settle
      await page.screenshot({ path: `${ARTIFACT_DIR}/step5_compatibility_result.png` });
      console.log("Saved step5_compatibility_result.png");
    }

    // ── Step 6: Visit Aquarium Dashboard ──
    console.log("Navigating to Aquarium Dashboard...");
    await page.goto("https://aquaguide-frontend.pages.dev/aquarium");
    await page.waitForTimeout(6000); // wait for 3D engine/canvas to mount
    await page.screenshot({ path: `${ARTIFACT_DIR}/step6_aquarium_home.png` });
    console.log("Saved step6_aquarium_home.png");

  } catch (error) {
    console.error("Simulation failed:", error);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
}

main();
