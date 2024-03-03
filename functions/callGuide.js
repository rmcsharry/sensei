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

  console.log("Available guides: " + sensei.guides.map(g => g.name).join(", "));
  console.log("Calling the guide called " + name + "...")
  console.log("With the prompt: " + prompt + "...");

  try {
    const response = await fetch(uri, {
      method: 'POST', // Assuming the guide expects a POST request
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }) // Adjust based on the guide's expected payload
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data; // Adjust based on the guide's response structure
  } catch (error) {
    console.error("Failed to call the guide:", error);
    return "Failed to fetch guide response.";
  }
}

module.exports = callGuide;
