import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import regexPatterns from '../regex';  // Import the regex patterns

const Home = () => {
  const { login, logout, signMessage, user, authenticated } = usePrivy();
  const { ready, wallets } = useWallets();
  const [isRecording, setIsRecording] = useState(false);
  const [audioPromptUrl, setAudioPromptUrl] = useState('');
  const [audioResponseUrl, setAudioResponseUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visibleForm, setVisibleForm] = useState(''); // Track which form is visible
  const [errorMessage, setErrorMessage] = useState(''); // Track the error message
  const audioPromptRef = useRef();
  const audioResponseRef = useRef();
  const threadContainerRef = useRef();
  const recorderRef = useRef(null); // useRef for recorder
  const audioStreamRef = useRef(null); // useRef for audio stream
  
  const transferAction = "Transfer 1 ETH to alice.eth on Ethereum";
  const swapAction = "Swap 0.5 ETH for USDC on Ethereum";

  // Assign the functions to the window object
  useEffect(() => {
    window.handleSignMessage = (e, action) => handleSignMessage(e, action, wallets);
  }, [wallets]);

  const handleStartRecording = async () => {
    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(audioStream);
    let audioChunks = [];

    recorder.ondataavailable = e => {
      audioChunks.push(e.data);
    };

    recorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioPromptUrl(audioUrl);

      const formData = new FormData();
      formData.append("audioFile", audioBlob, "audio.mp3");

      try {
        const response = await fetch("/upload-audio", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        if (data.requestId) {
          pollStatus(data.requestId, handleTranscriptionResult, handleError);
        }
      } catch (error) {
        console.error("Error uploading audio: ", error);
      }
    };

    recorder.start();
    recorderRef.current = recorder;
    audioStreamRef.current = audioStream;
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
  };

  const handleSubmitPrompt = async (e) => {
    e.preventDefault();
    displayPrompt(prompt);
    try {
      const response = await fetch('/prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt }),
      });
      const data = await response.json();
      if (data.requestId) {
        pollStatus(data.requestId, handleGuideResponse, handleError);
      }
    } catch (error) {
      console.error('Error sending prompt:', error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: username, password }),
      });
  
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const data = await response.json();
          throw new Error(data.message || 'Registration failed');
        } else {
          throw new Error('Server error');
        }
      }
  
      const data = await response.json();
      console.log('Registration successful', data);
      setErrorMessage('');
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage(error.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: username, password }),
      });
  
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const data = await response.json();
          throw new Error(data.message || 'Login failed');
        } else {
          throw new Error('Server error');
        }
      }
  
      const data = await response.json();
      console.log('Login successful', data);
      setErrorMessage('');
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage(error.message);
    }
  };

  const handlePrivyLogin = async (e) => {
    e.preventDefault();
    if (!ready || (ready && authenticated)) return;

    try {
      await login();
      setErrorMessage('');
    } catch (error) {
      console.error('Privy login error:', error);
      setErrorMessage(error.message);
    }
  };

  const handlePrivyLogout = async (e) => {
    e.preventDefault();
    if (!ready || (ready && !authenticated)) return;

    try {
      await logout();
      setErrorMessage('');
    } catch (error) {
      console.error('Privy logout error:', error);
      setErrorMessage(error.message);
    }
  };

  // Wrapper function to randomly select an action and call handleSignMessage
  const handleRandomSignMessage = (e) => {
    const actions = [transferAction, swapAction];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    handleSignMessage(e, randomAction, wallets);
  };

  // Function to sign an intention with the embedded Privy wallet
  const handleSignMessage = async (e, action, wallets) => {
    if (e) e.preventDefault();
    console.log("handleSignMessage called with action:", action);
    if (!wallets || wallets.length === 0) {
      console.error("No wallets available.");
      setErrorMessage("No wallets available.");
      return;
    }
    console.info("Wallets:", wallets);
    const wallet = wallets[0];
  
    // Construct the message object using the action parameter and environment variables
    const message = {
      action: action,
      from: wallet.address,
      bundler: '0x42fA5d9E5b0B1c039b08853cF62f8E869e8E5bAf',
      expiry: 1734752013,
      nonce: 0 // need to track this internally, in the database
    };
  
    const uiConfig = {
      title: 'Intention Check',
      description: 'Please sign this message if it matches what you want to do. After you sign, it will be sent to the bundler to be executed on the Oya virtual chain.',
      buttonText: 'Sign and Continue',
    };
  
    try {
      const signature = await signMessage(JSON.stringify(message), uiConfig);
      const response = await fetch('/api/send-signed-intention', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intention: message,
          signature: signature,
          from: wallet.address,
        }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to send intention to bundler server');
      }
  
      const result = await response.json();
      console.log('Intention processed:\n', result);
      setErrorMessage('');
      // Try creating a system prompt and calling sendPromptToBackend
      sendPromptToBackend("Thank you, I signed and sent the intention to the Oya bundler.");
    } catch (error) {
      console.error('Sign message error:', error);
      setErrorMessage(error.message);
      sendPromptToBackend("I'm sorry, I was unable to sign and send the intention to the Oya bundler. Either the intention did not match what I wanted to do, or there was a technical issue.")
    }
  };  

  // Add function to create a new contact, matching a name to an Ethereum address
  const updateContact = async (e, contact, wallets) => {
    if (e) e.preventDefault();
    console.log("updateContact called with contact information:", contact);
    // contact should be saved to database
    // existing contacts in database should be added to system prompt on startup
  };

  const showForm = (form) => {
    setVisibleForm(form);
    setErrorMessage(''); // Clear any existing error message when switching forms
  };

  const pollStatus = (requestId, onSuccess, onError) => {
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/status/${requestId}`);
        const data = await response.json();
        if (data.status === 'completed') {
          clearInterval(intervalId);
          onSuccess(data);
        } else if (data.status === 'failed') {
          clearInterval(intervalId);
          onError(data);
        }
      } catch (error) {
        console.error('Polling error:', error);
        clearInterval(intervalId);
        onError(error);
      }
    }, 2000);
  };

  const playAudioFromURL = (audioUrl) => {
    setAudioResponseUrl(audioUrl);
    if (audioResponseRef.current) {
      try {
        audioResponseRef.current.play().catch(error => {
          console.error('Error playing audio:', error);
        });
      } catch (error) {
        console.error('Error in playAudioFromURL:', error);
      }
    } else {
      console.error('Audio element is not available.');
    }
  };

  const handleTranscriptionResult = (data) => {
    displayPrompt(data.data.transcription);
    sendPromptToBackend(data.data.transcription);
  };

  const displayPrompt = (prompt) => {
    const promptElement = document.createElement("pre");
    promptElement.classList.add(styles.jsonResponse);
    promptElement.textContent = JSON.stringify({ role: "user", content: prompt }, null, 2);
    threadContainerRef.current.insertBefore(promptElement, threadContainerRef.current.firstChild);
  };

  const sendPromptToBackend = async (prompt) => {
    try {
      const response = await fetch('/prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt }),
      });
      const data = await response.json();
      if (data.requestId) {
        pollStatus(data.requestId, handleGuideResponse, handleError);
      }
    } catch (error) {
      console.error('Error sending prompt:', error);
    }
  };

  const handleGuideResponse = (data) => {
    if (data.data && data.data.role && data.data.content) {
      // Extract intention and action from the content using the regex patterns from config
      const matchedPattern = regexPatterns.find(pattern => {
        const match = data.data.content.match(pattern.regex);
        return match;
      });
      if (matchedPattern) {
        const match = data.data.content.match(matchedPattern.regex);
        const action = match ? (match[1] || match[2]) : null;
        if (action) {
          const functionName = matchedPattern.functionName;
          if (functionName === 'handleSignMessage') {
            console.log("Intention found:", action);
          }
          if (typeof window[functionName] === 'function') {
            window[functionName](null, action);
          } else {
            console.error(`Function ${functionName} not found.`);
          }
        }
      } else {
        console.error("No matching pattern found in the content that would trigger a function call. Returning guide response.");
        displayTextResponse(data.data.content);
        if (data.data.audioUrl) {
          playAudioFromURL(data.data.audioUrl);
        }
      }
    } else {
      console.error("Unexpected data structure from backend:", data);
    }
  };

  const displayTextResponse = (text) => {
    const responseElement = document.createElement("pre");
    responseElement.classList.add(styles.jsonResponse);
    responseElement.textContent = JSON.stringify({ role: "guide", content: text }, null, 2);
    threadContainerRef.current.insertBefore(responseElement, threadContainerRef.current.firstChild);
  };

  const handleError = (error) => {
    console.error("Polling error or processing error: ", error);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Sensei</title>
        <link rel="stylesheet" href="/style.css" />
      </Head>
      <div id="audioRecordingSection">
        <h3>Record your prompt</h3>
        <button type="button" onClick={handleStartRecording} disabled={isRecording}>Start Recording</button>
        <button type="button" onClick={handleStopRecording} disabled={!isRecording}>Stop Recording</button>
        {audioPromptUrl && (
          <audio ref={audioPromptRef} src={audioPromptUrl} controls hidden={!audioPromptUrl} />
        )}
        {audioResponseUrl && (
          <audio ref={audioResponseRef} src={audioResponseUrl} controls hidden={!audioResponseUrl} />
        )}
      </div>
  
      <br /><br />
  
      <div id="threadContainer" ref={threadContainerRef}></div>
  
      <br /><br />
  
      {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}
  
      <form id="chatForm" className={visibleForm === 'chat' ? '' : styles.hidden} onSubmit={handleSubmitPrompt}>
        <label htmlFor="prompt">Enter your prompt:</label>
        <br />
        <textarea id="prompt" name="prompt" rows="10" cols="60" value={prompt} onChange={(e) => setPrompt(e.target.value)}></textarea>
        <br />
        <button type="submit">Send</button>
      </form>
  
      <form id="registerForm" className={visibleForm === 'register' ? '' : styles.hidden} onSubmit={handleRegister}>
        <label htmlFor="username">Username:</label>
        <input type="text" id="registerUsername" name="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <label htmlFor="password">Password:</label>
        <input type="password" id="registerPassword" name="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Register</button>
      </form>
  
      <form id="loginForm" className={visibleForm === 'login' ? '' : styles.hidden} onSubmit={handleLogin}>
        <label htmlFor="username">Username:</label>
        <input type="text" id="loginUsername" name="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <label htmlFor="password">Password:</label>
        <input type="password" id="loginPassword" name="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Log in</button>
      </form>
  
      <button type="button" onClick={() => showForm('chat')}>Show Chat Form</button>
      <button type="button" onClick={() => showForm('register')}>Show Register Form</button>
      <button type="button" onClick={() => showForm('login')}>Show Login Form</button>
  
      <button type="button" disabled={!ready || (ready && authenticated)} onClick={handlePrivyLogin}>Log in with Privy</button>
      <button type="button" disabled={!ready || (ready && !authenticated)} onClick={handlePrivyLogout}>Log out with Privy</button>
      <button type="button" onClick={handleRandomSignMessage}>Sign Message</button>
    </div>
  );
};

export default Home;
