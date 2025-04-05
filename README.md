# Agentic Prompt Refiner & Single-Shot Planner

This Chrome extension leverages Google's Gemini API in an agentic workflow to refine prompts for complex tasks. As a special feature, if the task description relates to travel planning, it uses the refined prompt to generate a complete draft itinerary in a single, non-interactive step.

## Overview

This plugin serves two main purposes:

1.  **Prompt Refinement:** For any task description you provide, it internally uses a multi-step AI process (Draft -> Evaluate -> Revise) to generate a refined prompt designed to elicit better, more structured responses from Large Language Models (LLMs). It displays the initial draft, the evaluation details (based on criteria for good prompting), and the final revised prompt.
2.  **Single-Shot Travel Planning:** If the initial task description contains keywords related to travel (e.g., "trip," "vacation," "itinerary," "visit Paris"), the plugin performs an additional step after refining the prompt. It uses the refined prompt to instruct a powerful LLM (like Gemini Pro) to generate a *complete* draft travel plan based *only* on the initial details provided, all in one go. **There is no interactive chat or back-and-forth for planning.**

The goal is to provide both insights into prompt engineering and a quick-start draft plan for travel requests.

## How it Works

1.  **Input:** User enters a task description or details for a trip plan into the extension's popup.
2.  **Internal Prompt Refinement (All Tasks):**
    * The plugin sends the task description to the background.
    * An LLM (e.g., Gemini Flash) generates a *draft prompt* suitable for the task. If identified as travel planning, the draft aims for single-shot plan generation.
    * The draft prompt is evaluated by the LLM against specific criteria (focused on clarity, structure, and effectiveness for single-shot generation if planning). The results are formatted as JSON.
    * The LLM revises the draft prompt based on the evaluation feedback, creating a *final refined prompt*.
3.  **Task Type Check:** The background script checks the original task description for travel-related keywords.
4.  **Optional: Single-Shot Plan Generation (Travel Tasks Only):**
    * If the task is identified as travel planning, the plugin uses the *final refined prompt* as instructions for a more capable LLM (e.g., Gemini Pro).
    * It provides the original task description as input and requests a complete draft itinerary in a single response, explicitly instructing the LLM *not* to ask clarifying questions but to make plausible assumptions.
5.  **Output:**
    * The refinement details (Initial Draft Prompt, Evaluation JSON, Final Revised Prompt) are **always** displayed.
    * If it was identified as a travel planning task, the generated single-shot Trip Plan Draft is **also** displayed.

## Features

* **Agentic Prompt Refinement:** Utilizes a Draft->Evaluate->Revise workflow.
* **Conditional Plan Generation:** Automatically detects travel planning requests.
* **Single-Shot Planning:** Generates a complete draft itinerary non-interactively for travel tasks.
* **Transparency:** Shows the intermediate steps of prompt refinement.
* Powered by Google Gemini API.
* Simple popup interface.

## Technology Stack

* JavaScript (ES6+)
* HTML5 / CSS3
* Chrome Extension APIs (Manifest V3, Service Workers, Messaging)
* Google Gemini API (potentially using different models like Flash for refinement and Pro for planning)

## Setup and Installation

1.  **Clone or Download:** Get the code files (`manifest.json`, `popup.html`, `popup.js`, `background.js`, `README.md`) and the `images` folder.
2.  **Get Google Gemini API Key:**
    * Obtain an API key from Google AI Studio: [https://aistudio.google.com/](https://aistudio.google.com/)
3.  **Add API Key to Code:**
    * Open the `background.js` file in a text editor.
    * Find the line: `const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";`
    * Replace `"YOUR_GEMINI_API_KEY_HERE"` with your actual Gemini API key.
    * **SECURITY WARNING:** This method of including the API key is insecure for distribution. Never commit your key to public repositories. Use secure key management for real applications.
4.  **Save `background.js`**.
5.  **Load the Extension in Chrome:**
    * Open Google Chrome and navigate to `chrome://extensions`.
    * Enable **"Developer mode"** (top-right toggle).
    * Click **"Load unpacked"** (top-left).
    * Select the extension's root folder (the one containing `manifest.json`).
    * Ensure the extension ("Agentic Prompt Refiner & Planner") is enabled. Reload it using the reload icon on its card if you make code changes.

## Usage

1.  Click the extension's icon in your Chrome toolbar.
2.  Enter a description of the task OR the details for the trip you want planned in the text area.
3.  Click the "Refine / Plan" button.
4.  Wait while the plugin processes (refinement takes a few seconds; planning adds more time).
5.  View the "Prompt Refinement Details" section (always shown on success).
6.  If your request was detected as travel planning, view the generated draft plan in the "Generated Trip Plan Draft" section.

## Internal Evaluator Criteria (Example)

During the refinement step, prompts are evaluated internally. For single-shot planning prompts, the criteria focus on aspects like:

```json
{
  "clarity_of_task": boolean, // Is task clear?
  "completeness_instruction": boolean | null, // Does it ask for a complete plan? (null if not planning)
  "no_questions_instruction": boolean | null, // Does it forbid questions? (null if not planning)
  "structured_output_guidance": boolean, // Does it suggest output format?
  "handling_missing_info": boolean | null, // Does it guide assumption-making? (null if not planning)
  "overall_effectiveness_single_shot": boolean, // Good for one response?
  "summary": "Brief text summary noting strengths/weaknesses."
}
