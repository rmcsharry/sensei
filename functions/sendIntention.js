const dotenv = require('dotenv');
dotenv.config(); // Ensure that environment variables are loaded

async function sendIntention(action) {
  const intention = {
    action: action,
    bundler: process.env.BUNDLER_ADDRESS,
    expiry: process.env.EXPIRY,
    nonce: process.env.NONCE // need to track this internally, in the database
  }
  return intention;
}

export default sendIntention;
