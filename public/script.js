document.getElementById('chatForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const prompt = document.getElementById('prompt').value;
  fetch('/prompt', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
  })
  .then(response => response.json())
  .then(data => {
      console.log("Request initiated", data);
      // Start polling for the result using the requestId
      if (data.requestId) {
          pollStatus(data.requestId);
      }
  })
  .catch(error => console.error('Error:', error));
});

function pollStatus(requestId) {
  console.log('Polling for status with requestId:', requestId);
  const intervalId = setInterval(() => {
      fetch(`/status/${requestId}`)
          .then(response => response.json())
          .then(data => {
              console.log('Polling response:', data);
              if (data.status === 'completed' || data.status === 'failed') {
                  clearInterval(intervalId); // Stop polling
                  document.getElementById('jsonResponse').textContent = JSON.stringify(data, null, 2);
              }
          })
          .catch(error => {
              console.error('Polling error:', error);
              clearInterval(intervalId);
          });
  }, 2000); // Poll every 2 seconds
}