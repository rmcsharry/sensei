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
  const threadContainer = document.getElementById('threadContainer');
  const intervalId = setInterval(() => {
    fetch(`/status/${requestId}`)
    .then(response => response.json())
    .then(data => {
      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(intervalId);
        const newResponseElement = document.createElement("pre");
        newResponseElement.classList.add("jsonResponse");
        newResponseElement.textContent = JSON.stringify(data, null, 2);
        if (threadContainer.firstChild) {
          threadContainer.insertBefore(newResponseElement, threadContainer.firstChild);
        } else {
          threadContainer.appendChild(newResponseElement);
        }
      }
    })
    .catch(error => {
      console.error('Polling error:', error);
      clearInterval(intervalId);
    });
  }, 2000);
}
  