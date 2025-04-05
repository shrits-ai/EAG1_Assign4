# AI Trip Planner Chrome Extension (User API Key)

## Description

This Chrome extension helps you plan your trips by leveraging Google's Generative AI (Gemini models) to create personalized travel itineraries. Simply provide your destination, dates, interests, budget, and any other notes, and the extension will generate a suggested day-by-day plan.

**Important:** This extension requires you to provide your **own** Google API Key for the Gemini API. You are responsible for managing your API key and any associated usage costs with Google.

## Features

* Generates travel itineraries based on user inputs:
    * Destination
    * Dates
    * Interests (e.g., history, food, nature)
    * Budget (Budget, Mid-range, Luxury)
    * Additional notes
* Provides a day-by-day plan within the extension popup.
* Attempts to include cost estimations (based on LLM knowledge).
* Attempts to identify the type of reasoning used by the AI (feature depends on LLM output).
* Simple interface via the extension popup.
* User configures their own Google API Key via an dedicated Options page.

## Prerequisites

* Google Chrome browser installed.
* A Google API Key for the Gemini API. You can obtain one from [Google AI Studio](https://aistudio.google.com/app/apikey).

## Installation and Setup

1.  **Download or Clone:** Download the extension files or clone the repository to your local machine.
2.  **Open Chrome Extensions:** Open Google Chrome, type `chrome://extensions` in the address bar, and press Enter.
3.  **Enable Developer Mode:** Ensure the "Developer mode" toggle switch (usually in the top-right corner) is turned ON.
4.  **Load Unpacked:** Click the "Load unpacked" button (usually in the top-left corner).
5.  **Select Folder:** Navigate to and select the directory where you downloaded/cloned the extension files (the folder containing `manifest.json`).
6.  **Configure API Key:**
    * Find the newly added "AI Trip Planner" extension card on the `chrome://extensions` page.
    * Alternatively, right-click the extension's icon (once it appears in your Chrome toolbar, you might need to pin it) and select "Options".
    * The Options page will open in a new tab.
    * Paste your Google API Key (obtained from Google AI Studio) into the input field.
    * Click "Save Key".

## Usage

1.  Click the AI Trip Planner icon in your Chrome toolbar.
2.  The extension popup will appear.
3.  Fill in the details for your desired trip (Destination, Dates, Interests, etc.).
4.  Click the "Plan My Trip" button.
5.  Wait for the AI to generate the itinerary. Loading may take a few moments.
6.  The generated plan will appear in the results area of the popup.
7.  If you encounter errors, ensure your API key is correctly saved in the Options page and is valid. Check the console (Right-click popup -> Inspect) for detailed error messages.

## Technology Stack

* HTML5
* CSS3
* JavaScript (ES6+)
* Chrome Extension APIs (Manifest V3, `chrome.storage`, `Workspace`)
* Google Generative AI API (Gemini Pro / Gemini 1.5 Pro)

## Important Notes & Disclaimer

* **API Key Security:** Your API key is stored locally using `chrome.storage.local`. While this is standard practice for user-provided keys in extensions, be aware of the security implications of storing sensitive keys in a browser environment.
* **API Costs:** All calls made to the Google Generative AI API using your key are subject to Google's pricing and usage limits. You are solely responsible for any costs incurred.
* **Itinerary Accuracy:** The generated itineraries are suggestions created by an AI. Always double-check opening hours, addresses, booking requirements, costs, travel times, and safety information from official sources before finalizing your plans. This tool is intended for inspiration and planning assistance, not as a definitive travel guide.
* **Content Safety:** The extension relies on Google's API safety settings. Requests or responses might be blocked if they trigger these filters.

## License

This project is licensed under the MIT License - see the `LICENSE.md` file for details (or add license text here).