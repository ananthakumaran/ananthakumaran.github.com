const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const books = require("./books.json");

async function fetch(books, browser) {
  if (books.length === 0) {
    await browser.close();
    return;
  }

  const [book, ...rest] = books;
  const id = book["Book Id"];
  const title = book["Title"];

  const coverPath = path.join("public", "covers", `${id}.jpg`);
  const htmlPath = path.join("books", `${id}.html`);
  // const pngPath = path.join("books", `${id}.png`);

  if (fs.existsSync(coverPath)) {
    await fetch(rest, browser);
  } else {
    console.log("fetching...", id, title);
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    });
    try {
      await page.goto(`https://www.goodreads.com/book/show/${id}`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      const body = await page.content();
      fs.writeFileSync(htmlPath, body);

      await page.waitForSelector(".BookCover__image img", { timeout: 30000 });
      // await page.screenshot({ path: pngPath, fullPage: true });
      const cover = await page.$(".BookCover__image img");
      if (cover) {
        const coverUrl = await cover.getAttribute("src");
        const response = await page.request.get(coverUrl);
        const buffer = await response.body();
        fs.writeFileSync(coverPath, buffer);
        console.log("saved cover:", id);
      } else {
        console.log("no cover found:", id);
      }
    } catch (err) {
      console.error("error fetching:", id, err.message);
    } finally {
      await page.close();
      await fetch(rest, browser);
    }
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  await fetch(books, browser);
})();
