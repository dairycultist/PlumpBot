const { firefox } = require("playwright"); // npm install playwright
const fs = require("fs");

fs.readFile("./login.env", "utf8", async (err, data) => {

	if (err) {
		console.error("Error reading file: ", err);
		return;
	}

	data = data.split("\n");

	const email = data[0];
	const password = data[1];

	// open playwright window
	const browser = await firefox.launch({ headless: false });
	const page = await browser.newPage();
	await page.goto("https://console.paperspace.com/login");
	
	await page.locator(`[name="email"]`).fill(email);
	await page.locator(`[name="password"]`).fill(password);
	
	await page.getByRole("button", { name: "Log in" }).click();

	await new Promise(resolve => setTimeout(resolve, 5 * 1000));

	await page.screenshot({ path: "screenshot.png" });

	await browser.close();

});