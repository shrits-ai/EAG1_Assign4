# AI Trip Planner Chrome Extension (User API Key)

## Description

This Chrome extension helps you plan your trips by leveraging Google's Generative AI (Gemini models) to create personalized travel itineraries. Simply provide your destination, dates, interests, budget, and any other notes, and the extension will generate a suggested day-by-day plan. **You can then interactively refine the generated plan through follow-up instructions.**

**Important:** This extension requires you to provide your **own** Google API Key for the Gemini API. You are responsible for managing your API key and any associated usage costs with Google. Conversation history for refinement is stored locally in your browser's storage.

## Features

* Generates initial travel itineraries based on user inputs (Destination, Dates, Interests, Budget, Notes).
* **Allows users to refine the generated itinerary through conversational feedback (multi-turn).**
* Provides a day-by-day plan within the extension popup, rendered from Markdown.
* Attempts to include cost estimations and reasoning tags within the plan (based on LLM capabilities).
* Simple interface via the extension popup with dedicated refinement input.
* User configures their own Google API Key via a dedicated Options page.
* Stores conversation history locally using `chrome.storage.local` to allow refinement across short periods.

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
5.  Wait for the AI to generate the initial itinerary. Loading may take a few moments.
6.  The generated plan will appear in the results area of the popup.
7.  **To refine the plan:**
    * Type your feedback or requested changes into the "Refine the plan" text area that appears below the results (e.g., "Make Day 2 less busy", "Add more museums", "Can you find cheaper lunch options?").
    * Click the "Refine Plan" button.
    * Wait for the updated itinerary to be generated based on your feedback.
8.  If you encounter errors, ensure your API key is correctly saved in the Options page and is valid. Check the background script console (via `chrome://extensions`) for detailed error messages.

## Technology Stack

* HTML5
* CSS3
* JavaScript (ES6+)
* Chrome Extension APIs (Manifest V3, `chrome.storage.local`, `chrome.runtime`)
* Google Generative AI API (Gemini Pro / Gemini 1.5 Pro)
* marked.js (for Markdown rendering)
## Important Notes & Disclaimer

## Important Notes & Disclaimer

* **API Key Security:** Your API key is stored locally using `chrome.storage.local`. Be aware of the security implications of storing sensitive keys in a browser environment.
* **Conversation History Storage:** The history of your current trip planning conversation (initial request, refinements, AI responses) is also stored using `chrome.storage.local` to allow refinement if the extension's background process restarts. This data remains local to your browser. Clearing browser storage or reinstalling the extension may remove this history.
* **API Costs:** All calls made to the Google Generative AI API using your key are subject to Google's pricing and usage limits. You are solely responsible for any costs incurred.
* **Itinerary Accuracy:** The generated itineraries are suggestions created by an AI. Always double-check opening hours, addresses, booking requirements, costs, travel times, and safety information from official sources before finalizing your plans. This tool is intended for inspiration and planning assistance, not as a definitive travel guide.
* **Content Safety:** The extension relies on Google's API safety settings. Requests or responses might be blocked if they trigger these filters.

## License

This project is licensed under the MIT License - see the `LICENSE.md` file for details (or add license text here).
