// popup.js

const planTripBtn = document.getElementById('planTripBtn');
const destinationInput = document.getElementById('destination');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const interestsInput = document.getElementById('interests');
const budgetSelect = document.getElementById('budget');
const extraNotesInput = document.getElementById('extraNotes');
const resultsDiv = document.getElementById('results');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');

planTripBtn.addEventListener('click', () => {
    // --- 1. Get User Inputs ---
    const destination = destinationInput.value.trim();
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const interests = interestsInput.value.trim();
    const budget = budgetSelect.value;
    const notes = extraNotesInput.value.trim();

    // --- Basic Validation ---
    if (!destination) {
        showError('Please enter a destination.');
        return;
    }

    // Clear previous results/errors and show loading
    resultsDiv.innerHTML = '';
    hideError();
    loadingDiv.style.display = 'block';
    planTripBtn.disabled = true; // Prevent multiple clicks

    // --- 2. Retrieve API Key ---
    chrome.storage.local.get(['googleApiKey'], (result) => {
        const apiKey = result.googleApiKey;

        if (!apiKey) {
            showError('API Key not set. Please set it in the extension options (Right-click extension icon -> Options).');
            loadingDiv.style.display = 'none';
            planTripBtn.disabled = false;
            return;
        }

        // --- 3. Construct the Prompt ---
        // (This needs significant refinement for good results!)
        let prompt = `Generate a travel itinerary for a trip to ${destination}.`;
        if (startDate && endDate) prompt += ` From ${startDate} to ${endDate}.`;
        prompt += ` The budget is ${budget}.`;
        if (interests) prompt += ` Focus on interests like: ${interests}.`;
        if (notes) prompt += ` Keep in mind these additional notes: ${notes}.`;

        prompt += `\n\nPlease provide the output as follows:
        - A brief overall summary.
        - Day-wise planning (Day 1: [Date], Morning: ..., Afternoon: ..., Evening: ...). For each activity, estimate the cost if possible.
        - An overall estimated cost for the planned activities/local transport (excluding flights/accommodation).
        - Tag the type of reasoning used (e.g., Constraint Satisfaction, Information Retrieval, Creative Generation).`;
        // ^^^ This prompt structure is basic and needs iteration!

        console.log("Sending Prompt:", prompt); // For debugging

        // --- 4. Call the Google Gemini API ---
        callGoogleApi(apiKey, prompt);
    });
});

async function callGoogleApi(apiKey, promptText) {
    // Or try this for the latest 1.5 Pro model:
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`;
    const requestBody = {
        contents: [{
            parts: [{
                text: promptText
            }]
        }],
        // Add generationConfig if needed (temperature, max output tokens etc)
        // generationConfig: {
        //     temperature: 0.7,
        //     maxOutputTokens: 1024,
        // }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        loadingDiv.style.display = 'none';
        planTripBtn.disabled = false;

        if (!response.ok) {
            // Try to get error details from Google's response
            let errorDetails = `HTTP error! Status: ${response.status}`;
            try {
                const errorData = await response.json();
                console.error("API Error Response:", errorData);
                errorDetails += ` - ${errorData.error?.message || JSON.stringify(errorData)}`;
            } catch (e) {
                 errorDetails += ` - ${response.statusText}`;
                 console.error("Could not parse error response:", e);
            }
             // Handle common errors specifically
             if (response.status === 400) { // Often indicates bad API key or malformed request
                 errorDetails += "\nPossible causes: Invalid API Key, incorrect request format, or potentially unsafe content in the prompt/response (check Google's safety settings). Please verify your API key in options and the prompt content.";
             } else if (response.status === 429) { // Quota exceeded
                 errorDetails += "\nAPI quota exceeded. Please check your usage limits in the Google Cloud Console or AI Studio.";
             }
            showError(errorDetails);
            return;
        }

        const data = await response.json();
        console.log("API Response:", data); // For debugging

        // --- 5. Process and Display Results ---
        // Basic processing - Assumes response structure; **NEEDS ROBUST PARSING**
        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
             // Check for safety ratings - if blocked, show message
             if (data.candidates[0].finishReason === 'SAFETY') {
                 showError("The request or response was blocked due to safety concerns. Try modifying your input.");
                 return;
             }

            const itineraryText = data.candidates[0].content.parts[0].text;
            // TODO: Implement more sophisticated parsing here to extract sections
            // (Summary, Day Plan, Cost, Reasoning) instead of just dumping text.
            //resultsDiv.textContent = itineraryText; // Display raw text for now
                // Convert Markdown to HTML using marked.js
            const renderedHtml = marked.parse(itineraryText); // Use marked.parse()

            // Set the innerHTML of the results div
            resultsDiv.innerHTML = renderedHtml;
        } else if (data.promptFeedback && data.promptFeedback.blockReason) {
             // Handle cases where the prompt itself was blocked
             showError(`Prompt blocked due to safety concerns: ${data.promptFeedback.blockReason}. Please modify your input.`);
        }
         else {
            console.error("Unexpected response structure:", data);
            showError('Received an unexpected response structure from the API.');
        }

    } catch (error) {
        console.error('Fetch Error:', error);
        loadingDiv.style.display = 'none';
        planTripBtn.disabled = false;
        showError(`An error occurred: ${error.message}. Check the console for details.`);
    }
}

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function hideError() {
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
}