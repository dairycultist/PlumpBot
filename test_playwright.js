const { firefox } = require("playwright"); // npm install playwright

(async () => {
	const browser = await firefox.launch();
	const page = await browser.newPage();
	await page.goto("https://console.paperspace.com/login");
  
	await page.screenshot({ path: "screenshot.png" });
	await page.locator(`[name="email"]`).screenshot({ animations: 'disabled', path: 'screenshot.png' });

	await browser.close();
})();