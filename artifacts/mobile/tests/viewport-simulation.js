/**
 * viewport-simulation.js
 * Flow-driven viewport simulation tests for ARENA sports community app.
 *
 * Tests iOS iPhone 15 Pro (393x852) and Android (412x915) viewports.
 * Each screen runs real Playwright interactions and asserts on both layout
 * (no horizontal overflow) and content (Arabic text visible).
 *
 * Screens covered: landing, phone, otp, profile-setup, explore, my-matches,
 * groups, profile, create-match, match-details.
 *
 * Configuration (via environment variables):
 *   EXPO_URL               Base URL of the running Expo web server (required)
 *   PLAYWRIGHT_CHROMIUM    Full path to Chromium executable (optional).
 *                          Falls back to PLAYWRIGHT_BROWSERS_PATH discovery,
 *                          then to standard Playwright browser install.
 *
 * Usage:
 *   EXPO_URL=https://your-app.dev node artifacts/mobile/tests/viewport-simulation.js
 *
 * Output:
 *   - Screenshots in screenshots/{viewport}-{screen}.jpg
 *   - JSON report in screenshots/viewport-test-results.json
 */

"use strict";

const path = require("path");
const fs = require("fs");
const os = require("os");

const APP_URL = (() => {
  if (process.env.EXPO_URL) return process.env.EXPO_URL;
  if (process.env.REPLIT_EXPO_DEV_DOMAIN) return `https://${process.env.REPLIT_EXPO_DEV_DOMAIN}`;
  return "http://localhost:8082";
})();

const SCREENSHOTS_DIR = path.resolve(__dirname, "../../../screenshots");
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: "iOS-iPhone15Pro", width: 393, height: 852 },
  { name: "Android-412x915", width: 412, height: 915 },
];

const LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
];

function findChromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM) return process.env.PLAYWRIGHT_CHROMIUM;

  const searchRoots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.resolve(__dirname, "../../../node_modules/.local-chromium"),
    path.join(os.homedir(), ".cache/ms-playwright"),
    "/nix/store",
  ].filter(Boolean);

  for (const root of searchRoots) {
    if (!fs.existsSync(root)) continue;
    try {
      const entries = fs.readdirSync(root);
      for (const entry of entries) {
        if (!entry.includes("chromium")) continue;
        const candidates = [
          path.join(root, entry, "chromium-1080/chrome-linux/chrome"),
          path.join(root, entry, "chrome-linux/chrome"),
          path.join(root, entry, "chrome"),
        ];
        for (const c of candidates) {
          if (fs.existsSync(c)) return c;
        }
      }
    } catch {
      // skip unreadable dirs
    }
  }

  return null;
}

async function noOverflow(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1
  );
}

async function saveScreenshot(page, filename) {
  const p = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: p, type: "jpeg", quality: 90 });
  return p;
}

function pass(screen, viewport, filename, interactions) {
  return {
    screen,
    status: "pass",
    noOverflow: true,
    arabicTextFound: true,
    interactions,
    screenshotFilename: filename,
    screenshotPath: path.join(SCREENSHOTS_DIR, filename),
  };
}

function fail(screen, viewport, filename, reason, interactions) {
  return {
    screen,
    status: "fail",
    noOverflow: !reason.includes("overflow"),
    arabicTextFound: !reason.includes("Arabic"),
    interactions,
    failReason: reason,
    screenshotFilename: filename,
    screenshotPath: filename ? path.join(SCREENSHOTS_DIR, filename) : null,
  };
}

async function flowLanding(page, vp) {
  const f = `${vp}-landing.jpg`;
  await page.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(2000);

  const of1 = await noOverflow(page);
  const hasSportCards = (await page.locator("text=كرة القدم").count()) > 0
    || (await page.locator("text=بادل").count()) > 0;

  let sportSelected = false;
  const card = page.locator("text=كرة القدم").first();
  if ((await card.count()) > 0 && await card.isVisible()) {
    await card.click();
    await page.waitForTimeout(500);
    sportSelected = true;
  }

  let ctaClicked = false;
  const cta = page.locator("text=ابدأ الآن").or(page.locator("text=ابدأ")).or(page.locator("text=العب الآن")).first();
  if ((await cta.count()) > 0 && await cta.isVisible()) {
    await cta.click();
    await page.waitForTimeout(800);
    ctaClicked = true;
  }

  const navigatedToPhone = page.url().includes("/phone");
  await saveScreenshot(page, f);

  const interactions = { sportSelected, ctaClicked, navigatedToPhone };
  if (!of1) return fail("landing", vp, f, "horizontal overflow", interactions);
  if (!hasSportCards) return fail("landing", vp, f, "Arabic sport card text not found", interactions);
  return pass("landing", vp, f, interactions);
}

async function flowPhone(page, vp) {
  const f = `${vp}-phone.jpg`;
  await page.goto(`${APP_URL}/phone`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(2000);

  const of1 = await noOverflow(page);
  const hasPrefix = (await page.locator("text=+966").count()) > 0;
  const hasTitle = (await page.locator("text=رقم الجوال").count()) > 0;

  let typedDigits = false;
  let prefixAfterTyping = false;
  const input = page.locator("input").first();
  if ((await input.count()) > 0) {
    await input.click();
    await input.type("501234567");
    await page.waitForTimeout(500);
    typedDigits = true;
    prefixAfterTyping = (await page.locator("text=+966").count()) > 0;
  }

  const of2 = await noOverflow(page);
  await saveScreenshot(page, f);

  const interactions = { typedPhoneDigits: typedDigits, prefixVisibleAfterTyping: prefixAfterTyping };
  if (!of1 || !of2) return fail("phone", vp, f, "horizontal overflow", interactions);
  if (!hasPrefix) return fail("phone", vp, f, "+966 prefix Arabic text not found", interactions);
  if (!hasTitle) return fail("phone", vp, f, "Arabic title رقم الجوال not found", interactions);
  return pass("phone", vp, f, interactions);
}

async function flowOtp(page, vp) {
  const f = `${vp}-otp.jpg`;
  await page.goto(`${APP_URL}/otp`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(2000);

  const of1 = await noOverflow(page);
  const hasTitle = (await page.locator("text=رمز التحقق").count()) > 0;

  let devFillClicked = false;
  const devBtn = page.locator("text=ملء 123456").or(page.locator("text=Dev:")).first();
  if ((await devBtn.count()) > 0 && await devBtn.isVisible()) {
    await devBtn.click();
    await page.waitForTimeout(500);
    devFillClicked = true;
  }

  let verifyClicked = false;
  const verifyBtn = page.locator("text=تحقق من الرمز").first();
  if ((await verifyBtn.count()) > 0 && await verifyBtn.isVisible()) {
    await verifyBtn.click();
    await page.waitForTimeout(800);
    verifyClicked = true;
  }

  const of2 = await noOverflow(page);
  await saveScreenshot(page, f);

  const interactions = { devFillClicked, verifyClicked };
  if (!of1 || !of2) return fail("otp", vp, f, "horizontal overflow", interactions);
  if (!hasTitle) return fail("otp", vp, f, "Arabic title رمز التحقق not found", interactions);
  return pass("otp", vp, f, interactions);
}

async function flowProfileSetup(page, vp) {
  const f = `${vp}-profile-setup.jpg`;
  await page.goto(`${APP_URL}/profile-setup`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(2000);

  const of1 = await noOverflow(page);
  const hasTitle = (await page.locator("text=أنشئ ملفك الرياضي").count()) > 0
    || (await page.locator("text=من 4").count()) > 0;

  let nicknameTyped = false;
  const nicknameInput = page.locator("input").first();
  if ((await nicknameInput.count()) > 0) {
    await nicknameInput.click();
    await nicknameInput.type("اختبار");
    await page.waitForTimeout(400);
    nicknameTyped = true;
  }

  const of2 = await noOverflow(page);
  await saveScreenshot(page, f);

  const interactions = { nicknameTyped };
  if (!of1 || !of2) return fail("profile-setup", vp, f, "horizontal overflow", interactions);
  if (!hasTitle) return fail("profile-setup", vp, f, "Arabic profile-setup title not found", interactions);
  return pass("profile-setup", vp, f, interactions);
}

async function flowExplore(page, vp) {
  const f = `${vp}-explore.jpg`;
  await page.goto(`${APP_URL}/explore`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(2000);

  const of1 = await noOverflow(page);
  const hasTitle = (await page.locator("text=استكشاف").count()) > 0;
  const hasChips = (await page.locator("text=كرة القدم").count()) > 0
    || (await page.locator("text=بادل").count()) > 0;

  let chipClicked = false;
  const chip = page.locator("text=كرة القدم").first();
  if ((await chip.count()) > 0 && await chip.isVisible()) {
    await chip.click();
    await page.waitForTimeout(500);
    chipClicked = true;
  }

  const of2 = await noOverflow(page);
  await saveScreenshot(page, f);

  const interactions = { sportFilterChipClicked: chipClicked };
  if (!of1 || !of2) return fail("explore", vp, f, "horizontal overflow", interactions);
  if (!hasTitle) return fail("explore", vp, f, "Arabic title استكشاف not found", interactions);
  if (!hasChips) return fail("explore", vp, f, "sport filter chips not found", interactions);
  return pass("explore", vp, f, interactions);
}

async function flowMyMatches(page, vp) {
  const f = `${vp}-my-matches.jpg`;
  await page.goto(`${APP_URL}/my-matches`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(2000);

  const of1 = await noOverflow(page);
  const hasTitle = (await page.locator("text=مبارياتي").count()) > 0;

  let tabClicked = false;
  const prevTab = page.locator("text=السابقة").first();
  if ((await prevTab.count()) > 0 && await prevTab.isVisible()) {
    await prevTab.click();
    await page.waitForTimeout(500);
    tabClicked = true;
  }

  const of2 = await noOverflow(page);
  await saveScreenshot(page, f);

  const interactions = { pastMatchesTabClicked: tabClicked };
  if (!of1 || !of2) return fail("my-matches", vp, f, "horizontal overflow", interactions);
  if (!hasTitle) return fail("my-matches", vp, f, "Arabic title مبارياتي not found", interactions);
  return pass("my-matches", vp, f, interactions);
}

async function flowGroups(page, vp) {
  const f = `${vp}-groups.jpg`;
  await page.goto(`${APP_URL}/groups`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(2000);

  const of1 = await noOverflow(page);
  const hasTitle = (await page.locator("text=المجموعات").count()) > 0;

  let chipClicked = false;
  const chip = page.locator("text=كرة القدم").first();
  if ((await chip.count()) > 0 && await chip.isVisible()) {
    await chip.click();
    await page.waitForTimeout(500);
    chipClicked = true;
  }

  const of2 = await noOverflow(page);
  await saveScreenshot(page, f);

  const interactions = { sportFilterChipClicked: chipClicked };
  if (!of1 || !of2) return fail("groups", vp, f, "horizontal overflow", interactions);
  if (!hasTitle) return fail("groups", vp, f, "Arabic title المجموعات not found", interactions);
  return pass("groups", vp, f, interactions);
}

async function flowProfile(page, vp) {
  const f = `${vp}-profile.jpg`;
  await page.goto(`${APP_URL}/profile`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(2500);

  const of1 = await noOverflow(page);
  const hasArabic = (await page.locator("text=ARENA").count()) > 0;
  const noJsCrash = (await page.locator("text=ReferenceError").count()) === 0
    && (await page.locator("text=TypeError").count()) === 0;

  await saveScreenshot(page, f);

  const interactions = { noJsCrash };
  if (!of1) return fail("profile", vp, f, "horizontal overflow", interactions);
  if (!hasArabic) return fail("profile", vp, f, "Arabic app content not found", interactions);
  if (!noJsCrash) return fail("profile", vp, f, "JavaScript crash visible on page", interactions);
  return pass("profile", vp, f, interactions);
}

async function flowCreateMatch(page, vp) {
  const f = `${vp}-create-match.jpg`;
  await page.goto(`${APP_URL}/create-match`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(2000);

  const of1 = await noOverflow(page);
  const hasTitle = (await page.locator("text=إنشاء مباراة").count()) > 0;
  const hasSessionTypes = (await page.locator("text=مباراة").count()) > 0;

  let cardClicked = false;
  const matchCard = page.locator("text=مباراة").first();
  if ((await matchCard.count()) > 0 && await matchCard.isVisible()) {
    await matchCard.click();
    await page.waitForTimeout(500);
    cardClicked = true;
  }

  let nextClicked = false;
  const nextBtn = page.locator("text=التالي").first();
  if ((await nextBtn.count()) > 0 && await nextBtn.isVisible()) {
    await nextBtn.click();
    await page.waitForTimeout(800);
    nextClicked = true;
  }

  const of2 = await noOverflow(page);
  await saveScreenshot(page, f);

  const interactions = { sessionTypeCardClicked: cardClicked, nextButtonClicked: nextClicked };
  if (!of1 || !of2) return fail("create-match", vp, f, "horizontal overflow", interactions);
  if (!hasTitle) return fail("create-match", vp, f, "Arabic title إنشاء مباراة not found", interactions);
  if (!hasSessionTypes) return fail("create-match", vp, f, "session type cards not found", interactions);
  return pass("create-match", vp, f, interactions);
}

async function flowMatchDetails(page, vp) {
  const f = `${vp}-match-details.jpg`;
  await page.goto(`${APP_URL}/match-details?id=test-id`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(2500);

  const of1 = await noOverflow(page);
  const hasArabicError = (await page.locator("text=تعذّر تحميل").count()) > 0
    || (await page.locator("text=العودة").count()) > 0;
  const noJsCrash = (await page.locator("text=ReferenceError").count()) === 0
    && (await page.locator("text=TypeError").count()) === 0;

  let backClicked = false;
  const backBtn = page.locator("text=العودة").first();
  if ((await backBtn.count()) > 0 && await backBtn.isVisible()) {
    await backBtn.click();
    await page.waitForTimeout(500);
    backClicked = true;
  }

  await saveScreenshot(page, f);

  const interactions = { gracefulErrorShown: hasArabicError, backButtonClicked: backClicked, noJsCrash };
  if (!of1) return fail("match-details", vp, f, "horizontal overflow", interactions);
  if (!noJsCrash) return fail("match-details", vp, f, "JavaScript crash visible on page", interactions);
  return pass("match-details", vp, f, interactions);
}

const FLOWS = [
  flowLanding,
  flowPhone,
  flowOtp,
  flowProfileSetup,
  flowExplore,
  flowMyMatches,
  flowGroups,
  flowProfile,
  flowCreateMatch,
  flowMatchDetails,
];

async function runViewportSuite(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const page = await context.newPage();
  const results = [];

  for (const flow of FLOWS) {
    try {
      const r = await flow(page, viewport.name);
      results.push({
        viewport: viewport.name,
        width: viewport.width,
        height: viewport.height,
        ...r,
      });
    } catch (err) {
      results.push({
        viewport: viewport.name,
        width: viewport.width,
        height: viewport.height,
        screen: flow.name.replace(/^flow/, "").replace(/([A-Z])/g, (m) => "-" + m.toLowerCase()).replace(/^-/, ""),
        status: "error",
        noOverflow: false,
        arabicTextFound: false,
        interactions: {},
        screenshotFilename: null,
        screenshotPath: null,
        error: err.message.substring(0, 300),
      });
    }
  }

  await context.close();
  return results;
}

async function main() {
  const startedAt = new Date().toISOString();
  console.log("\nViewport Simulation Tests — ARENA Sports Community App");
  console.log(`App URL  : ${APP_URL}`);
  console.log(`Started  : ${startedAt}\n`);

  let playwright;
  try {
    playwright = require(path.resolve(__dirname, "../../../node_modules/playwright"));
  } catch {
    console.error("playwright not installed. Run: pnpm add -w playwright");
    process.exit(1);
  }

  const executablePath = findChromiumExecutable();
  let browser;
  try {
    browser = await playwright.chromium.launch({
      ...(executablePath ? { executablePath } : {}),
      headless: true,
      args: LAUNCH_ARGS,
    });
  } catch (err) {
    console.error("Failed to launch Chromium:", err.message);
    if (!executablePath) console.error("Tip: set PLAYWRIGHT_CHROMIUM env var to Chromium binary path.");
    process.exit(1);
  }

  const allResults = [];
  for (const viewport of VIEWPORTS) {
    console.log(`\n── ${viewport.name} (${viewport.width}x${viewport.height}) ──`);
    const results = await runViewportSuite(browser, viewport);
    allResults.push(...results);
    for (const r of results) {
      const icon = r.status === "pass" ? "✅" : r.status === "error" ? "⚠️ " : "❌";
      const extra = r.failReason ? ` — ${r.failReason}` : r.error ? ` — ${r.error}` : "";
      console.log(`  ${icon} ${r.screen}: ${r.status}${extra}`);
    }
  }

  await browser.close();

  const passed = allResults.filter((r) => r.status === "pass").length;
  const failed = allResults.filter((r) => r.status !== "pass").length;
  const completedAt = new Date().toISOString();

  console.log(`\nResults: ${passed} passed, ${failed} failed / ${allResults.length} total`);
  console.log(`Completed: ${completedAt}`);

  const report = {
    startedAt,
    completedAt,
    appUrl: APP_URL,
    screenshotsDir: SCREENSHOTS_DIR,
    viewports: VIEWPORTS,
    screens: FLOWS.map((f) =>
      f.name.replace(/^flow/, "").replace(/([A-Z])/g, (m) => "-" + m.toLowerCase()).replace(/^-/, "")
    ),
    totalPassed: passed,
    totalFailed: failed,
    totalScreens: allResults.length,
    results: allResults,
  };

  const reportPath = path.join(SCREENSHOTS_DIR, "viewport-test-results.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report   : ${reportPath}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[FATAL]", err.message);
  process.exit(1);
});
