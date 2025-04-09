// background.js

// Load API Key from storage (Best Practice)
let GEMINI_API_KEY = ""; // Will be loaded from storage
const GEMINI_API_MODEL_REFINER = "gemini-1.5-flash-latest"; // Model for generating the initial system prompt
const GEMINI_API_MODEL_PLANNER = "gemini-1.5-pro-latest";  // More capable model for planning
const GEMINI_API_URL_BASE_REFINER = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_API_MODEL_REFINER}`;
const GEMINI_API_URL_BASE_PLANNER = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_API_MODEL_PLANNER}`;

// Function to load API key (remains the same)
async function loadApiKey() {
    try {
        const result = await chrome.storage.local.get(['googleApiKey']);
        if (result.googleApiKey) {
            GEMINI_API_KEY = result.googleApiKey;
            console.log("BG: API Key loaded successfully.");
        } else {
            console.error("BG Error: API Key not found in storage. Please set it in options.");
            GEMINI_API_KEY = "";
        }
    } catch (error) {
        console.error("BG Error: Failed to load API Key from storage:", error);
        GEMINI_API_KEY = "";
    }
}

// --- API Call Function ---
// (Remains the same as the version using chrome.storage.local)
async function callGeminiAPI(apiUrlBase, userPromptOrText, history = [], systemInstructionText = null) {
    if (!GEMINI_API_KEY) {
        await loadApiKey();
        if (!GEMINI_API_KEY) {
            throw new Error("API Key not set. Please configure it in the extension options.");
        }
    }

    const url = `${apiUrlBase}:generateContent?key=${GEMINI_API_KEY}`;
    const currentContents = [
        ...history,
        { role: "user", parts: [{ text: userPromptOrText }] }
    ];
    const requestBody = {
        contents: currentContents,
        generationConfig: { temperature: 0.7 }
     };
    if (systemInstructionText) {
        requestBody.systemInstruction = { parts: [{ text: systemInstructionText }] };
    }

    console.log(`BG: Calling Gemini API (${apiUrlBase.split('/')[5]}) with ${currentContents.length} history entries...`);
    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        const responseData = await response.json();

        if (!response.ok) throw new Error(`Gemini API Error: ${responseData?.error?.message || response.statusText}`);
        if (!responseData.candidates?.[0]?.content?.parts?.[0]?.text && responseData.candidates?.[0]?.finishReason !== "STOP") {
             const reason = responseData.candidates?.[0]?.finishReason || responseData.promptFeedback?.blockReason || "No Content";
             throw new Error(`Gemini API Error: ${reason}`);
        }

        const modelResponseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const modelRole = responseData.candidates?.[0]?.content?.role ?? "model";
        const newHistory = [
             ...currentContents,
             { role: modelRole, parts: [{ text: modelResponseText }] }
         ];
        console.log("BG: API call successful. New history length:", newHistory.length);
        return { responseText: modelResponseText, updatedHistory: newHistory };

    } catch (error) {
        console.error(`BG: Error during callGeminiAPI to ${apiUrlBase}:`, error);
        throw new Error(error.message || "Network error or failed API call.");
    }
}


// --- Simplified Prompt Generation Logic ---
// Only generates the initial system instruction now
async function generateInitialSystemPrompt(taskDescription) {
    console.log("BG: Internal - Generating initial system prompt for task:", taskDescription);
    // Simple instructions for the planner model
    const plannerInstructions = `You are a helpful travel planning assistant. Generate a complete, structured (e.g., day-by-day) travel itinerary in Markdown format based on the user's request. Include estimated costs (daily and total in USD) and reasoning tags (logical, lookup, arithmetic, preference) for activities. Make plausible assumptions for missing details. Do NOT ask clarifying questions; generate the full plan directly. Ensure the output follows the requested Markdown structure precisely.`;

    // Optionally, you could still use the refiner model to generate *this* instruction based on the taskDescription,
    // but for simplicity, we're using a fixed instruction here. If you wanted to use the refiner:
    // const promptForRefiner = `Based on the user task "${taskDescription}", write a concise system instruction for a different AI that will generate the travel plan...`;
    // const result = await callGeminiAPI(GEMINI_API_URL_BASE_REFINER, promptForRefiner, []);
    // return result.responseText;

    // Using fixed instruction for simplicity:
    return plannerInstructions;
}
// --- REMOVED evaluateDraftInternal and reviseDraftInternal ---


// --- Main Message Listener (Simplified Initial Plan) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("BG: Received message - Action:", request.action);

    (async () => {
        try {
            // Ensure API key is loaded
            if (!GEMINI_API_KEY) {
                await loadApiKey();
                if (!GEMINI_API_KEY) throw new Error("API Key is not configured...");
            }

            // ACTION: Start Trip Plan
            if (request.action === "startTripPlan") {
                console.log("BG: Starting new trip plan (simplified initial prompt)...");
                const userTaskDescription = request.prompt; // User's detailed request
                if (!userTaskDescription) throw new Error("Initial task description missing...");

                // --- Step 1: Generate System Prompt (Simplified) ---
                const systemPrompt = await generateInitialSystemPrompt(userTaskDescription);
                console.log("BG: Generated system prompt for initial call.");

                // --- Step 2: Call Planner API ---
                // Pass the generated system prompt as systemInstructionText
                const { responseText, updatedHistory } = await callGeminiAPI(
                    GEMINI_API_URL_BASE_PLANNER, // Use Planner model
                    userTaskDescription,         // User's actual request
                    [],                          // Start with empty history
                    systemPrompt                 // Use generated prompt as system instruction
                );

                // --- Step 3: Save history to storage ---
                await chrome.storage.local.set({ conversationHistory: updatedHistory });
                console.log("BG: Saved initial conversation history to storage.");

                sendResponse({ success: true, response: responseText });

            // ACTION: Refine Trip Plan (Remains the same)
            } else if (request.action === "refineTripPlan") {
                console.log("BG: Refining existing trip plan...");
                const userFeedback = request.feedback;
                if (!userFeedback) throw new Error("User feedback missing...");

                // Load history from storage
                const storageResult = await chrome.storage.local.get(['conversationHistory']);
                const currentHistory = storageResult.conversationHistory || [];
                if (currentHistory.length === 0) throw new Error("Cannot refine without an initial plan stored...");

                // Call Planner API with loaded history
                const { responseText, updatedHistory } = await callGeminiAPI(
                    GEMINI_API_URL_BASE_PLANNER,
                    userFeedback,
                    currentHistory, // Pass loaded history
                    null // No system instruction for refinement
                );

                // Save updated history back to storage
                await chrome.storage.local.set({ conversationHistory: updatedHistory });
                console.log("BG: Saved updated conversation history to storage.");

                sendResponse({ success: true, response: responseText });

            } else {
                throw new Error(`Unknown action received: ${request.action}`);
            }
        } catch (error) {
            console.error(`BG: Error processing action ${request.action || 'unknown'}:`, error);
            sendResponse({ success: false, error: error.message || "An unknown error occurred..." });
        }
    })();

    return true; // Indicate asynchronous response
});

// --- Initialization (Remains the same) ---
chrome.runtime.onInstalled.addListener(() => {
    console.log("BG: Trip Planner background script (storage) installed/updated.");
    loadApiKey();
    // Optional: Clear stored history
    // chrome.storage.local.remove('conversationHistory');
});
console.log("BG: Trip Planner background script (storage) loaded.");
loadApiKey();