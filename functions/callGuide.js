// This code should call a guide's prompt endpoint and return a result.
function callGuide(name) {
  console.log("Calling the guide called" + name + "...")
  return "The secret word is 'cat'. The secret number is 34."; // example 
}

module.exports = callGuide;