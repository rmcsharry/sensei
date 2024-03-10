let recorder, audioStream;
const startRecordingButton = document.getElementById("startRecording");
const stopRecordingButton = document.getElementById("stopRecording");
const audioElement = document.getElementById("audioPrompt");

function pollStatus(requestId, onSuccess, onError) {
  const intervalId = setInterval(() => {
    fetch(`/status/${requestId}`)
      .then(response => response.json())
      .then(data => {
        clearInterval(intervalId);
        if (data.status === 'completed') {
          onSuccess(data); // Call onSuccess handler with the received data
        } else if (data.status === 'failed') {
          onError(data); // Call onError handler with the error data
        }
        // If still processing, keep polling
      })
      .catch(error => {
        console.error('Polling error:', error);
        clearInterval(intervalId);
        onError(error); // Handle fetch errors
      });
  }, 2000); // Adjust polling interval as needed
}

function playAudioFromURL(audioUrl) {
  console.log("Attempting to play audio from URL:", audioUrl);
  const audioResponseElement = document.getElementById("audioResponse");
  audioResponseElement.src = audioUrl;
  audioResponseElement.hidden = false;
  audioResponseElement.play().catch(error => {
    console.error('Error playing audio:', error);
  });
}

document.addEventListener('DOMContentLoaded', (event) => {
  const chatForm = document.getElementById('chatForm');
  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');

  // Explicitly set initial display state to match CSS
  chatForm.style.display = 'none';
  registerForm.style.display = 'none';
  loginForm.style.display = 'none';

  const showChatFormButton = document.getElementById('showChatForm');
  const showRegisterFormButton = document.getElementById('showRegisterForm');
  const showLoginFormButton = document.getElementById('showLoginForm');

  showChatFormButton.addEventListener('click', () => {
      chatForm.style.display = chatForm.style.display === 'none' ? 'block' : 'none';
  });

  showRegisterFormButton.addEventListener('click', () => {
      registerForm.style.display = registerForm.style.display === 'none' ? 'block' : 'none';
  });

  showLoginFormButton.addEventListener('click', () => {
      loginForm.style.display = loginForm.style.display === 'none' ? 'block' : 'none';
  });
});

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
  
startRecordingButton.addEventListener("click", async () => {
  audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  recorder = new MediaRecorder(audioStream  );
  let audioChunks = [];

  recorder.ondataavailable = e => {
    audioChunks.push(e.data);
  };

  recorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
    audioElement.src = URL.createObjectURL(audioBlob);
    audioElement.hidden = false; // Show the audio player
    
    // Prepare the audio blob for uploading
    const formData = new FormData();
    formData.append("audioFile", audioBlob, "audio.mp3");
    
    // Send the audio file to the server
    fetch("/upload-audio", {
      method: "POST",
      body: formData,
    })
    .then(response => response.json())
    .then(data => {
      console.log(data);
      if (data.requestId) {
        pollStatus(data.requestId, handleTranscriptionResult, handleError);
      }
    })
    .catch(error => {
      console.error("Error uploading audio: ", error);
    });
  };

  recorder.start();
  stopRecordingButton.disabled = false; // Enable the stop recording button
});

function handleTranscriptionResult(data) {
  // This function will be called once the transcription is successfully retrieved
  displayTranscription(data.data.transcription);

  // Next, send the transcription as a prompt to get the guide's response
  sendPromptToBackend(data.data.transcription);
}

function displayTranscription(transcription) {
  const transcriptionElement = document.createElement("pre");
  transcriptionElement.classList.add("jsonResponse");
  transcriptionElement.textContent = JSON.stringify({ role: "user", content: transcription }, null, 2);
  threadContainer.insertBefore(transcriptionElement, threadContainer.firstChild);
}

function sendPromptToBackend(transcription) {
  fetch('/prompt', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: transcription }),
  })
  .then(response => response.json())
  .then(data => {
      if (data.requestId) {
          pollStatus(data.requestId, handleGuideResponse, handleError);
      }
  })
  .catch(error => console.error('Error sending prompt:', error));
}

function handleGuideResponse(data) {
  // Assuming the guide's response might include text and potentially an audio URL
  if (data.data.audioUrl) {
      // If there's an audio URL, play it
      playAudioFromURL(data.data.audioUrl);
  } else if (data.data.text) {
      // If there's text, display it (you might want to modify this part based on your actual data structure)
      displayTextResponse(data.data.text);
  }
}

function displayTextResponse(text) {
  const responseElement = document.createElement("pre");
  responseElement.classList.add("jsonResponse");
  responseElement.textContent = JSON.stringify({ role: "guide", content: text }, null, 2);
  threadContainer.insertBefore(responseElement, threadContainer.firstChild);
}


function handleError(error) {
  console.error("Polling error or processing error: ", error);
  // Implement UI feedback for errors, e.g., displaying an error message to the user
}

stopRecordingButton.addEventListener("click", () => {
  recorder.stop();
  audioStream.getTracks().forEach(track => track.stop());
  stopRecordingButton.disabled = true; // Disable the stop recording button again
});