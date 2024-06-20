async function createIntention(action) {
  const intention = {
    action: action
  }
  return intention;
}

module.exports = createIntention;
