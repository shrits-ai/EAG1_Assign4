// popup.js

// Initial Input Elements
const initialInputSection = document.getElementById('initialInputSection');
const taskDescInput = document.getElementById('taskDesc');
const processBtn = document.getElementById('processBtn');

// Refiner Output Elements
const refinerResultsArea = document.getElementById('refinerResultsArea');
const draftPromptPre = document.getElementById('draftPrompt');
const evaluationJsonPre = document.getElementById('evaluationJson');
const finalPromptPre = document.getElementById('finalPrompt');

// Planner Output Elements (Single Output)
const planOutputArea = document.getElementById('planOutputArea');
const planOutputPre = document.getElementById('planOutputPre');

// Common Elements
const loadingIndicator = document.getElementById('loadingIndicator');
const errorDisplay = document.getElementById('errorDisplay');

// --- Helper Functions ---

function showLoading(message = "Working...") {
    loadingIndicator.textContent = message;
    loadingIndicator.style.display = 'block';
    processBtn.disabled = true;
}

function hideLoading() {
    loadingIndicator.style.display = 'none';
    processBtn.disabled = false;
}

function showError(message) {
    const cleanMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    errorDisplay.innerHTML = cleanMessage;
    errorDisplay.style.display = 'block';
    hideLoading();
}

function clearError() {
    errorDisplay.textContent = '';
    errorDisplay.style.display = 'none';
}

// Displays the refiner results
function displayRefinerResults(draft, evaluation, final) {
    displayText(draftPromptPre, draft);
    displayJson(evaluationJsonPre, evaluation);
    displayText(finalPromptPre, final);
    refinerResultsArea.style.display = 'block'; // Show this section
}

// Displays the single plan output
function displayPlanOutput(planText) {
    displayText(planOutputPre, planText || "(No plan generated or empty response)");
    planOutputArea.style.display = 'block'; // Show this section
}

// Send message to background script helper
function sendMessageToBackground(action, payload) {
    console.log(`Popup: Sending message - Action: ${action}`, payload ? `Payload keys: ${Object.keys(payload)}`: '');
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action, ...payload }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Popup: chrome.runtime.lastError:", chrome.runtime.lastError);
                reject(new Error(`Extension messaging error: ${chrome.runtime.lastError.message}. Reloading the extension might help.`));
            } else if (response && response.success) {
                console.log(`Popup: Received success response for Action: ${action}`);
                resolve(response); // Resolve with the *entire* response object
            } else {
                const errorMsg = response?.error || "Unknown error from background. Check Service Worker console.";
                console.error(`Popup: Received error response for Action: ${action}:`, errorMsg);
                reject(new Error(errorMsg));
            }
        });
    });
}

// Helper to safely display text in <pre> tags
function displayText(element, text) {
    if (element) element.textContent = text ?? '(No content received)';
}

// Helper to display JSON prettily
function displayJson(element, jsonData) {
     if (element) {
         try {
             // Handle potential non-object JSON data (like null)
             if (typeof jsonData !== 'object' || jsonData === null) {
                 element.textContent = JSON.stringify(jsonData) ?? '(Invalid JSON received)';
             } else {
                 element.textContent = JSON.stringify(jsonData, null, 2);
             }
         }
         catch (e) { element.textContent = `(Error formatting JSON: ${e.message})`; }
     }
}

// --- Event Listener ---

processBtn.addEventListener('click', async () => {
    clearError();
    const taskDescription = taskDescInput.value.trim();
    if (!taskDescription) {
        showError("Please enter a task description or trip details.");
        return;
    }

    // Reset UI
    refinerResultsArea.style.display = 'none';
    planOutputArea.style.display = 'none'; // Hide plan output initially
    showLoading("Processing request... (Refining prompt and generating plan if applicable...)");

    try {
        // Single action handles both refinement and potential single-shot planning
        const response = await sendMessageToBackground('refineAndPotentiallyPlan', { task: taskDescription });

        hideLoading();

        // ALWAYS display the refinement results
        console.log("Popup: Displaying refinement results.");
        displayRefinerResults(response.draftPrompt, response.evaluationJson, response.finalPrompt);

        // If it was a planning session, display the generated plan output
        if (response.isPlanningSession) {
            console.log("Popup: Displaying generated plan.");
            displayPlanOutput(response.planOutput);
        } else {
            console.log("Popup: Task was not identified as planning; only refinement shown.");
            planOutputArea.style.display = 'none'; // Ensure plan area is hidden
        }
        // Keep initial input visible for next task
        initialInputSection.style.display = 'block';


    } catch (error) {
        console.error("Popup: Error processing task:", error);
        showError(`Error: ${error.message}`); // Display error in UI
        hideLoading();
        processBtn.disabled = false;
        // Ensure output areas are hidden on error
        refinerResultsArea.style.display = 'none';
        planOutputArea.style.display = 'none';
        initialInputSection.style.display = 'block'; // Show initial inputs again
    }
});


// --- Initial State ---
refinerResultsArea.style.display = 'none';
planOutputArea.style.display = 'none';