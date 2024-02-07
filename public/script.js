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
    const userPromptElement = document.createElement("pre");
    userPromptElement.classList.add("jsonResponse");
    userPromptElement.textContent = JSON.stringify({ role: "user", content: prompt }, null, 2);
    threadContainer.insertBefore(userPromptElement, threadContainer.firstChild);

      if (data.requestId) {
          pollStatus(data.requestId);
      }
  })
  .catch(error => console.error('Error:', error));
});

document.getElementById('registerForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const username = document.getElementById('registerUsername').value;
  const password = document.getElementById('registerPassword').value;
  fetch('/register', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: username, password }),
  })
  .then(response => response.json())
  .then(data => {
      console.log('Registration successful', data);
      // Handle successful registration, e.g., displaying a success message or redirecting
  })
  .catch(error => console.error('Error:', error));
});

document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  fetch('/login', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: username, password }),
  })
  .then(response => response.json())
  .then(data => {
      console.log('Login successful', data);
      // Handle successful login
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
  