const dotenv = require('dotenv');
dotenv.config(); // Ensure that environment variables are loaded

async function sendIntention(action) {
  // Create a mock event object since handleSignMessage expects an event
  const mockEvent = {
    preventDefault: () => {}
  };

  const handleSignMessage = async (e, action) => {
    e.preventDefault();
    console.info("Wallets:", wallets);
    const wallet = wallets[0];

    // Construct the message object using the action parameter and environment variables
    const message = {
      action: action,
      from: wallet.address,
      bundler: process.env.BUNDLER_ADDRESS,
      expiry: process.env.EXPIRY,
      nonce: process.env.NONCE // need to track this internally, in the database, in the future
    };

    const uiConfig = {
      title: 'Sign Intention',
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
    } catch (error) {
      console.error('Sign message error:', error);
      setErrorMessage(error.message);
    }
  };

  // Call handleSignMessage with the mock event and the action
  await handleSignMessage(mockEvent, action);
}

export default sendIntention;
