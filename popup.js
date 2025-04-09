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
const refinementSection = document.getElementById('refinement-section');
const refinementInput = document.getElementById('refinementInput');
const refineBtn = document.getElementById('refineBtn');
// --- Event Listener for Initial Planning ---
planTripBtn.addEventListener('click', () => {
    console.log("POPUP: 'Plan My Trip' button clicked."); // Log 1: Button clicked

    // --- 1. Get User Inputs ---
    const destination = destinationInput.value.trim();
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const interests = interestsInput.value.trim();
    const budget = budgetSelect.value;
    const notes = extraNotesInput.value.trim();
    console.log("POPUP: Inputs gathered:", { destination, startDate, endDate, interests, budget, notes }); // Log 2: Inputs gathered

    // --- Basic Validation ---
    if (!destination) {
        showError('Please enter a destination.');
        console.error("POPUP: Validation failed - No destination."); // Log 3a: Validation failed
        return;
    }

    // Clear previous results/errors and show loading
    resultsDiv.innerHTML = '';
    hideError();
    loadingDiv.style.display = 'block';
    planTripBtn.disabled = true; // Prevent multiple clicks
    refineBtn.disabled = true; // Also disable refine button

    // Hide refinement section when starting a new plan
    refinementSection.style.display = 'none';
    refinementInput.value = ''; // Clear previous feedback
    console.log("POPUP: UI cleared and loading shown."); // Log 4: UI reset

    // --- Construct the Prompt ---
    // (Make sure you have the detailed prompt from earlier steps here)
    let prompt = `Generate a complete, day-by-day travel itinerary for a trip to ${destination}.

    **Trip Details:**
    * **Dates:** ${startDate && endDate ? `From ${startDate} to ${endDate}` : 'Not specified, determine a reasonable duration.'}
    * **Budget Level:** ${budget}
    * **Interests:** ${interests || 'General tourist interests'}
    * **Additional Notes:** ${notes || 'None'}

    **Output Requirements:**
    * **Format:** Respond ONLY with the itinerary in Markdown format...
    * **Strict Structure:** Follow this exact Markdown structure...
        ## ✈️ Trip Plan for ${destination}...
        ---
        ### 🗓 Day 1...
        ---
        {{Continue for all days}}
    * **Content:** ...
    * **Reasoning Tags:** ... (logical, lookup, arithmetic, preference) ...
    * **Single Response:** Generate the entire plan in one single response...
    `;
    console.log("POPUP: Prompt constructed."); // Log 5: Prompt constructed

    // --- Send Message to Background Script ---
    console.log("POPUP: Attempting to send 'startTripPlan' message to background..."); // Log 6: About to send

    chrome.runtime.sendMessage(
        {
            action: "startTripPlan",
            prompt: prompt // Send the constructed prompt
        },
        (response) => {
            // --- Handle Response ---
            console.log("POPUP: Received response from background for startTripPlan:", response); // Log 7: Response received

            loadingDiv.style.display = 'none'; // Hide loading
            planTripBtn.disabled = false; // Re-enable button
             // Keep refine button disabled until refinement is possible after success

            if (chrome.runtime.lastError) {
                console.error("POPUP: Message sending failed:", chrome.runtime.lastError);
                showError(`Error communicating with background: ${chrome.runtime.lastError.message}`);
                refinementSection.style.display = 'none';
                return;
            }

            if (response && response.success) {
                console.log("POPUP: startTripPlan successful."); // Log 8a: Success
                const itineraryText = response.response;
                resultsDiv.innerHTML = marked.parse(itineraryText); // Render Markdown
                refinementSection.style.display = 'block'; // Show refinement section
                refineBtn.disabled = false; // Enable refine button now
                hideError();
            } else {
                console.error("POPUP: startTripPlan failed.", response); // Log 8b: Failure
                const errorMessage = response?.error || "An unknown error occurred during planning.";
                showError(errorMessage);
                refinementSection.style.display = 'none'; // Hide refinement section on error
                refineBtn.disabled = true; // Ensure refine button is disabled
            }
        }
    );
    console.log("POPUP: 'startTripPlan' message sent (sendMessage function call finished)."); // Log 9: Sent message call completed
});

// START: Add Event Listener for Refinement Button
// START: Updated Event Listener for Refinement Button
refineBtn.addEventListener('click', () => {
    const feedback = refinementInput.value.trim();
    if (!feedback) {
        showError("Please enter some feedback to refine the plan."); // Use your showError function
        return;
    }

    hideError(); // Use your hideError function
    console.log("Sending refinement feedback to background:", feedback);
    loadingDiv.style.display = 'block'; // Show loading
    refineBtn.disabled = true; // Disable button
    planTripBtn.disabled = true; // Also disable initial plan button

    // Send message to background script
    chrome.runtime.sendMessage(
        {
            action: "refineTripPlan",
            feedback: feedback
        },
        (response) => {
            // --- Handle response from background script ---
            loadingDiv.style.display = 'none'; // Hide loading
            refineBtn.disabled = false; // Re-enable button
            planTripBtn.disabled = false; // Re-enable button

            if (chrome.runtime.lastError) {
                // Handle potential errors during message sending itself
                console.error("Message sending failed:", chrome.runtime.lastError);
                showError(`Error communicating with background: ${chrome.runtime.lastError.message}`);
                return;
            }

            console.log("BG Response:", response);

            if (response && response.success) {
                // Update the results div with the refined plan
                const refinedItineraryText = response.response;
                resultsDiv.innerHTML = marked.parse(refinedItineraryText); // Render Markdown
                refinementInput.value = ''; // Clear feedback input on success
                hideError(); // Clear any previous errors
            } else {
                // Show error message received from background script
                const errorMessage = response?.error || "An unknown error occurred during refinement.";
                showError(errorMessage);
                // Do not clear resultsDiv here, user might want to see the previous plan
            }
        }
    );
});
// END: Updated Event Listener
// END: Add Event Listener

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
        refineBtn.disabled = false;

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
            // START: Show refinement section on success
            refinementSection.style.display = 'block';
            // END: Show refinement section
            hideError(); // Clear any previous errors
        } else if (data.promptFeedback && data.promptFeedback.blockReason) {
             // Handle cases where the prompt itself was blocked
             showError(`Prompt blocked due to safety concerns: ${data.promptFeedback.blockReason}. Please modify your input.`);
             refinementSection.style.display = 'none';
        }
         else {
            console.error("Unexpected response structure:", data);
            showError('Received an unexpected response structure from the API.');
            refinementSection.style.display = 'none';
        }

    } catch (error) {
        console.error('Fetch Error:', error);
        loadingDiv.style.display = 'none';
        planTripBtn.disabled = false;
        showError(`An error occurred: ${error.message}. Check the console for details.`);
        refinementSection.style.display = 'none';
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