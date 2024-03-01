// This code should call a guide's prompt endpoint and return a result.
function callGuide(uri) {
  console.log("Calling guide at " + uri + "...")
  return "The secret word is 'cat'."; // example 
}

module.exports = callGuide;