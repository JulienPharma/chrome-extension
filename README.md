# PharmaTalent LinkedIn Scraper

This repository contains a Chrome extension that allows PharmaTalent users to scrape LinkedIn profile data and send it to the PharmaTalent CRM. The extension injects scripts into LinkedIn pages to capture profile information and provides a convenient popup interface for authentication and project selection.

## Purpose

The extension simplifies the process of adding LinkedIn profiles to the PharmaTalent database. Users can scrape individual profiles or batch scrape results from LinkedIn Recruiter, speeding up outreach and lead generation.

## Usage

1. Clone or download this repository.
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select this `chrome-extension` folder.
5. The "PharmaTalent LinkedIn Scraper" icon will appear in your toolbar.
6. Open a LinkedIn profile or Recruiter search page and click the extension icon.
7. Log in with your PharmaTalent credentials, choose a project, and select **Scrape Current Profile** or **Start Pipeline Scraper**.

## Development Setup

No build step is required. JavaScript source files are loaded directly by Chrome. To modify API endpoints or defaults, edit `config.js`. You can also tweak scripts in `content.js`, `popup.js`, or `pipeline-scraper.js` as needed. After making changes, reload the extension from the Chrome extensions page.

## Project Structure

- `manifest.json` – Chrome extension manifest (v3)
- `popup.html` / `popup.js` – User interface and logic for the popup window
- `background.js` – Service worker that manages state and injected scripts
- `content.js` – Content script for scraping individual profiles
- `pipeline-scraper.js` – Script injected for batch scraping in Recruiter
- `auth.js`, `api-connector.js` – Helper modules for authentication and API calls

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
