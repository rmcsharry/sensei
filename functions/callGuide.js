const sensei = require('../sensei.json');

// This code should call a guide's prompt endpoint and return a result.
async function callGuide(name, prompt) {
  const guideNames = sensei.guides.map(guide => guide.name);
  console.log("Available guides: " + guideNames.join(", "));

  console.log("Calling the guide called " + name + "...")
  console.log("With the prompt: " + prompt + "...");
  if (name === "secret-word-example") {
    return "The secret word is 'cat'.";
  } else if (name === "secret-number-example") {
    return "The secret number is 34.";
  } else {
    return "Wrong name."
  }
}

module.exports = callGuide;