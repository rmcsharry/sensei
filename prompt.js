const https = require('https');
const readline = require('readline');

require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter your prompt: ', (userInput) => {
  const data = JSON.stringify({
    prompt: userInput
  });

  const options = {
    hostname: process.env.HEROKU_URI,
    path: '/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(options, (res) => {
    console.log(`statusCode: ${res.statusCode}`);

    res.on('data', (d) => {
      process.stdout.write(d);
    });
  });

  req.on('error', (error) => {
    console.error(error);
  });

  req.write(data);
  req.end();

  rl.close();
});
