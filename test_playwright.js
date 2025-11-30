const { firefox } = require("playwright"); // npm install playwright
const fs = require("fs");

// Putting up WebUI (I will send the link in this channel once it's up). This may take a while! This command is not very fieldtested --- if after >5 minutes it doesn't send anything, try again, but please be patient!

// await page.screenshot({ path: "screenshot.png" });

async function sleep(sec) {
	return new Promise(resolve => setTimeout(resolve, sec * 1000));
}

fs.readFile("./login.env", "utf8", async (err, data) => {

	if (err) {
		console.error("Error reading file: ", err);
		return;
	}

	data = data.split("\n");

	const email = data[0];
	const password = data[1];

	// open playwright window
	const browser = await firefox.launch({ headless: false }); // set to false to see what it's doing
	const page = await browser.newPage();

	// log in
	await page.goto("https://console.paperspace.com/login");
	
	await page.locator(`[name="email"]`).fill(email);
	await page.locator(`[name="password"]`).fill(password);
	
	await page.getByRole("button", { name: "Log in" }).click();

	await sleep(5);

	// go to notebook page
	await page.goto("https://console.paperspace.com/tbp1l86qmb/notebook/rzaf4sanl19bidn");
	
	await sleep(5);

	// stop notebook if it's running to ensure predictable state
	{
		const button = page.getByRole("button", { name: "Stop machine" });

		if (await button.count() != 0)
			await button.click();
	}

	// start notebook
	await page.getByRole("button", { name: "Start machine" }).click();
	await sleep(20);

	// run launcher
	await page.goto("https://console.paperspace.com/tbp1l86qmb/notebook/rzaf4sanl19bidn?file=%2Flauncher.ipynb");

	await page.getByRole("button", { name: "Run all" }).click();

	// run looper
	await page.goto("https://console.paperspace.com/tbp1l86qmb/notebook/rzaf4sanl19bidn?file=%2Flooper.ipynb");

	await page.getByRole("button", { name: "Run all" }).click();

	// open terminal
	await page.locator(`[aria-controls="radix-4-content-terminals"]`).click();

	await page.mouse.click(80, 100); // clicking doesn't always have a chance of working on the button so I just press it a bunch to ensure a terminal pops up
	await page.mouse.click(80, 100); // for some reason the selector didn't work, maybe because of the same click-dropping thing
	await page.mouse.click(80, 100);
	await page.mouse.click(80, 100);

	await sleep(60);

	await page.locator(`[aria-label="Terminal input"]`).fill("cd /notebooks/stable-diffusion-webui\nsource venv/bin/activate\n./webui.sh\n");

	await sleep(70);

	await page.locator(`[class="xterm-text-layer"]`).screenshot({ animations: "disabled", path: "link.png" });

	await browser.close();
});