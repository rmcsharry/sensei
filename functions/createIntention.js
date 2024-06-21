const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

async function createIntention(action) {
  const fetch = (await import('node-fetch')).default;

  const response = await fetch(`${baseUrl}/create-intention`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create intention: ${response.statusText}`);
  }

  const result = await response.json();
  return result;
}

module.exports = createIntention;
