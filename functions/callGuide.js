const sensei = require('../sensei.json');

async function callGuide(name, prompt) {
  const fetch = (await import('node-fetch')).default;
  const guide = sensei.guides.find(g => g.name === name);
  if (!guide) {
    console.log("Guide not found.");
    return "Wrong name.";
  }

  // Dynamically get the URI from environment variables
  const uri = process.env[name]; // Directly use 'name' to reference the env variable

  if (!uri) {
    console.log("URI for the guide not found in environment variables.");
    return "URI not set for " + name;
  }

  console.log(`Calling the guide called ${name} at ${uri}/prompt with the prompt: ${prompt}...`);

  try {
    // Initial POST request to the /prompt endpoint
    const promptResponse = await fetch(`${uri}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt })
    });

    if (!promptResponse.ok) {
      // Attempt to read the response body, which might contain more details about the error
      let errMsg = `Failed to submit prompt. Status: ${promptResponse.status} (${promptResponse.statusText})`;
      try {
        const errorBody = await promptResponse.json(); // Assuming the error body is JSON-formatted
        if (errorBody.error) {
          errMsg += `; Error: ${errorBody.error}`;
        } else if (errorBody.message) { // Some APIs might use a different field to convey error messages
          errMsg += `; Message: ${errorBody.message}`;
        }
      } catch (bodyError) {
        // If reading the body or parsing JSON fails, include a generic message
        errMsg += `. Additionally, there was an error parsing the error response: ${bodyError.message}`;
      }
      throw new Error(errMsg);
    }

    // Capture the 'Set-Cookie' header from the response
    const sessionCookie = promptResponse.headers.get('set-cookie');

    const { requestId } = await promptResponse.json();

    // Function to delay for polling
    const delay = time => new Promise(resolve => setTimeout(resolve, time));

    // Initialize statusResponse and statusData outside of the do-while loop
    let statusResponse, statusData;
    do {
      await delay(2000); // Wait for 2 seconds before polling again
      // Include the sessionCookie in the subsequent request to maintain the session
      statusResponse = await fetch(`${uri}/status/${requestId}`, {
        headers: {
          'Cookie': sessionCookie
        }
      });
      if (!statusResponse.ok) throw new Error('Failed to fetch status');
      statusData = await statusResponse.json();
    } while (statusData.status !== 'completed' && statusData.status !== 'failed');

    if (statusData.status === 'failed') {
      throw new Error('Guide processing failed.');
    }

    return statusData.data; // Final result from the guide
  } catch (error) {
    console.error("Failed to call the guide:", error);
    return "Failed to fetch guide response.";
  }
}

module.exports = callGuide;
