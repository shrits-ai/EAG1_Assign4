// background.js

// !!! IMPORTANT: Replace with your actual Gemini API Key !!!
const GEMINI_API_KEY = "AIzaSyDQ49J_L4C20nasxpGcThzxQktovTvNMZM"; // Replace with your actual Gemini API Key

// !!! IMPORTANT: Replace with your actual Gemini API Key !!!
// const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";
const GEMINI_API_MODEL_REFINER = "gemini-1.5-flash-latest"; // Model for refining the prompt
const GEMINI_API_MODEL_PLANNER = "gemini-1.5-pro-latest";  // More capable model for planning
const GEMINI_API_URL_BASE_REFINER = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_API_MODEL_REFINER}`;
const GEMINI_API_URL_BASE_PLANNER = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_API_MODEL_PLANNER}`;

// --- Generic API Call Function ---
// (No history needed for single-shot planner call, but keep parameter for refiner calls)
async function callGeminiAPI(apiUrlBase, promptText, systemInstruction = null, conversationHistory = []) {
    if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE" || !GEMINI_API_KEY) {
        console.error("BG Error: Gemini API Key not set.");
        throw new Error("API Key not set in background.js. Please add your key.");
    }
    const url = `${apiUrlBase}:generateContent?key=${GEMINI_API_KEY}`;
    // Refiner calls might still use history internally if needed, planner call won't.
    const contents = conversationHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }]
    }));
    contents.push({ role: "user", parts: [{ text: promptText }] }); // Always add the current prompt

    const requestBody = { contents: contents, generationConfig: { temperature: 0.7 } };
    if (systemInstruction) {
        requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    console.log(`BG: Calling Gemini API (${apiUrlBase.split('/')[5]})...`);
    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        const responseData = await response.json();
        if (!response.ok) {
            const message = responseData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
            console.error("BG: Gemini API Error Response:", responseData);
            throw new Error(`Gemini API Error: ${message}`);
        }
        if (!responseData.candidates?.[0]?.content?.parts?.[0]?.text && responseData.candidates?.[0]?.finishReason !== "STOP") {
             const finishReason = responseData.candidates?.[0]?.finishReason;
             const blockReason = responseData.promptFeedback?.blockReason;
             let errorMessage = "Received no valid text content.";
             if (blockReason) errorMessage = `Request Blocked: ${blockReason}.`;
             else if (finishReason && finishReason !== "STOP") errorMessage = `Generation Stopped: ${finishReason}.`;
             console.error("BG: Gemini API - No valid candidate content.", responseData);
             throw new Error(`Gemini API Error: ${errorMessage}`);
         }
        return responseData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } catch (error) {
        console.error("BG: Error during callGeminiAPI:", error);
        throw new Error(error.message || "Network error or failed API call.");
    }
}

// --- Prompt Refinement Logic (Updated for Single-Shot Goal) ---

async function generateDraftInternal(taskDescription, isPlanningTask = false) {
    console.log("BG: Internal - Generating draft prompt for task:", taskDescription);
    // *** Updated Instructions for Planner Prompt Goal ***
    const plannerInstructions = isPlanningTask ? `
This generated prompt MUST instruct the LLM planner to:
1.  Generate a complete, structured (e.g., day-by-day) travel itinerary based *only* on the details provided in the user's request.
2.  Make plausible assumptions or provide reasonable options for any missing details (like specific budget numbers, pace, accommodation style) based on the user's stated interests/style.
3.  Explicitly state that it should **NOT** ask clarifying questions, but generate the full plan directly in a single response.
4.  Include estimated costs or budget ranges where appropriate.
5.  Ensure the output is well-organized and easy to read.` : `This prompt should encourage the LLM to think step-by-step, potentially use tools (if implied by the task), and structure its output clearly. Ensure the prompt is self-contained and provides enough context for the LLM to begin the task.`;

    const systemInstruction = "You are an expert prompt engineer creating effective prompts for LLMs.";
    const prompt = `Based on the task description below, write a detailed first draft of a prompt for an LLM.
${plannerInstructions}

Task Description:
"${taskDescription}"

Generate ONLY the draft prompt itself, without any surrounding explanation or markdown formatting.`;
    return await callGeminiAPI(GEMINI_API_URL_BASE_REFINER, prompt, systemInstruction);
}

async function evaluateDraftInternal(draftPrompt, isPlanningTask = false) {
     console.log("BG: Internal - Evaluating draft prompt...");
     // *** Updated Evaluator Instructions & Criteria ***
    const evaluatorInstructions = `You are a Prompt Evaluation Assistant. Analyze the following prompt based on how well it guides an LLM to perform its task in a SINGLE RESPONSE, without asking questions (especially for planning tasks).

**Evaluation Criteria:**

1.  **Clarity of Task:** Is the task for the LLM clear from the prompt?
2.  **Completeness Instruction (for Planning):** If it's a planning prompt, does it explicitly instruct the LLM to generate a *complete* plan in one go? ✅/➖
3.  **No-Questions Instruction (for Planning):** If planning, does it explicitly forbid asking questions? ✅/➖
4.  **Structured Output Guidance:** Does it suggest a clear output format (e.g., day-by-day, JSON)? ✅
5.  **Handling Missing Info (for Planning):** If planning, does it guide the LLM on making plausible assumptions? ✅/➖
6.  **Overall Effectiveness for Single Shot:** Is the prompt likely to result in a good quality single response? ✅

---
**Input Prompt to Evaluate:**
\`\`\`prompt
${draftPrompt}
\`\`\`
---
**Your Response:** Respond ONLY with a single JSON object. Mark planning-specific criteria with \`true\`/\`false\` if applicable (isPlanningTask=${isPlanningTask}), otherwise use \`null\`.

\`\`\`json
{
  "clarity_of_task": boolean,
  "completeness_instruction": boolean | null,
  "no_questions_instruction": boolean | null,
  "structured_output_guidance": boolean,
  "handling_missing_info": boolean | null,
  "overall_effectiveness_single_shot": boolean,
  "summary": "Brief text summary noting strengths/weaknesses for single-shot generation."
}
\`\`\`
`;
    const jsonResponseText = await callGeminiAPI(GEMINI_API_URL_BASE_REFINER, evaluatorInstructions, null);
    try {
        const cleanedJsonText = jsonResponseText.replace(/^```(?:json)?\s*|```$/gm, '').trim();
        if (!cleanedJsonText) throw new Error("LLM returned empty response for evaluation.");
        const evaluation = JSON.parse(cleanedJsonText);
        // Basic validation - adapt keys as needed
        const requiredKeys = ["clarity_of_task", "completeness_instruction", "no_questions_instruction", "structured_output_guidance", "handling_missing_info", "overall_effectiveness_single_shot", "summary"];
        if (!requiredKeys.every(key => key in evaluation)) throw new Error("Evaluation JSON is missing required keys.");
        console.log("BG: Internal - Evaluation JSON parsed.");
        return evaluation;
    } catch (parseError) {
        console.error("BG: Internal - Failed to parse evaluation JSON:", parseError, "Raw:", jsonResponseText);
        throw new Error(`Internal Error: Failed to parse prompt evaluation JSON. Details: ${parseError.message}`);
    }
}

async function reviseDraftInternal(taskDescription, draftPrompt, evaluationJson, isPlanningTask = false) {
     console.log("BG: Internal - Revising draft prompt...");
     // *** Updated Revision Instructions ***
     const plannerRevisionFocus = isPlanningTask ? `Focus especially on ensuring the prompt explicitly demands a complete, single-shot plan without questions, and guides plausible assumption-making.` : `Focus on clarity, structure, and step-by-step guidance if applicable.`;

     const systemInstruction = "You are an expert prompt engineer revising prompts based on evaluation feedback for single-response generation.";
     const prompt = `Objective: Revise the prompt below based on the evaluation feedback to make it more effective for generating a high-quality SINGLE response.
Original Task Description: "${taskDescription}"

---
First Draft Prompt:
\`\`\`prompt
${draftPrompt}
\`\`\`
---
Evaluation Feedback (JSON):
\`\`\`json
${JSON.stringify(evaluationJson, null, 2)}
\`\`\`
---
Revise the **first draft prompt** based on the feedback. Improve areas marked \`false\` or noted as weaknesses in the \`summary\`. ${plannerRevisionFocus}

Generate ONLY the **final, revised prompt**, without explanation or markdown formatting.`;
    return await callGeminiAPI(GEMINI_API_URL_BASE_REFINER, prompt, systemInstruction);
}


// --- Keyword check for Travel Planning (same as before) ---
function isTravelPlanningTask(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    const keywords = ['trip', 'travel', 'vacation', 'holiday', 'itinerary', 'plan journey', 'plan a visit', 'plan my visit', 'planning a visit', 'visit to', 'travel to', 'holiday to', 'journey to', 'city break', 'weekend away', 'backpacking', 'road trip'];
    const locations = ['paris', 'london', 'tokyo', 'rome', 'japan', 'italy', 'scotland', 'europe']; // Example locations
    if (keywords.some(keyword => lowerText.includes(keyword))) return true;
    if ((lowerText.includes('visit ') || lowerText.includes('go to ') || lowerText.includes('travel to ')) && locations.some(loc => lowerText.includes(loc)) ) return true;
    return false;
}


// --- Main Message Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("BG: Received message:", request.action);

    (async () => {
        try {
            // Action: refineAndPotentiallyPlan (Single action now)
            if (request.action === "refineAndPotentiallyPlan") {
                const taskDescription = request.task;
                if (!taskDescription) throw new Error("Task description missing.");

                console.log("BG: Running prompt refinement for task:", taskDescription);
                const isPlanning = isTravelPlanningTask(taskDescription);
                console.log("BG: Is travel planning task?", isPlanning);

                // 1. Refine Prompt
                const draft = await generateDraftInternal(taskDescription, isPlanning);
                const evaluation = await evaluateDraftInternal(draft, isPlanning);
                const finalPrompt = await reviseDraftInternal(taskDescription, draft, evaluation, isPlanning);
                console.log("BG: Prompt refinement complete.");
                // console.log("BG: Final Refined Prompt for Planner:", finalPrompt); // Debug

                // 2. Prepare base response (always includes refinement details)
                const responsePayload = {
                    success: true,
                    isPlanningSession: isPlanning, // Still useful flag for UI
                    draftPrompt: draft,
                    evaluationJson: evaluation,
                    finalPrompt: finalPrompt,
                    planOutput: null // Initialize plan output
                };

                // 3. If Planning, execute the single plan generation call
                if (isPlanning) {
                    console.log("BG: Generating single-shot trip plan...");
                    // Use the refined prompt as system instruction, original task as user prompt
                    const planOutput = await callGeminiAPI(
                        GEMINI_API_URL_BASE_PLANNER,
                        taskDescription, // Provide the original task description to the planner
                        finalPrompt,     // Use the refined prompt as the system instruction
                        []               // No prior conversation history needed
                    );
                    console.log("BG: Plan generation complete.");
                    responsePayload.planOutput = planOutput; // Add plan output
                    sendResponse(responsePayload);
                } else {
                    console.log("BG: Returning refined prompt details only.");
                    sendResponse(responsePayload); // Send payload without plan output
                }

            // Removed continuePlanning case

            } else {
                throw new Error(`Unknown action: ${request.action}`);
            }
        } catch (error) {
            console.error(`BG: Error processing action ${request.action}:`, error);
            sendResponse({ success: false, error: error.message || "An unknown error occurred." });
        }
    })();

    return true; // Indicate asynchronous response
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("Agentic Refiner & Planner (Single Shot) background script installed/updated.");
});
console.log("Agentic Refiner & Planner (Single Shot) background script loaded.");