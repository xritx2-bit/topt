const db = require('./db');

// Add a vouch for a trader
function addVouch({ targetId, authorId, type = 1, comment = '', proof = '' }) {
  if (targetId === authorId) {
    return { success: false, message: 'You cannot vouch for yourself!' };
  }

  const newVouch = {
    id: db.vouches.length > 0 ? Math.max(...db.vouches.map(v => v.id)) + 1 : 1,
    targetId,
    authorId,
    type: type >= 0 ? 1 : -1,
    comment: comment.trim(),
    proof: proof.trim(),
    timestamp: Math.floor(Date.now() / 1000)
  };

  db.vouches.push(newVouch);
  db.save('vouches');

  return { success: true, vouch: newVouch };
}

// Get trading reputation profile for a user
function getReputation(targetId) {
  const userVouches = db.vouches.filter(v => v.targetId === targetId);
  const positive = userVouches.filter(v => v.type === 1).length;
  const negative = userVouches.filter(v => v.type === -1).length;
  const total = userVouches.length;

  let trustScore = 100;
  if (total > 0) {
    trustScore = Math.round((positive / total) * 100);
  }

  // Recent 5 vouches sorted newest first
  const recent = [...userVouches]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  return {
    targetId,
    positive,
    negative,
    total,
    trustScore,
    recent
  };
}

// Get all vouches for a user
function getUserVouches(targetId) {
  return db.vouches
    .filter(v => v.targetId === targetId)
    .sort((a, b) => b.timestamp - a.timestamp);
}

// Remove a fake or invalid vouch (Admin/Mod action)
function deleteVouch(vouchId) {
  const index = db.vouches.findIndex(v => v.id === parseInt(vouchId));
  if (index === -1) return false;

  db.vouches.splice(index, 1);
  db.save('vouches');
  return true;
}

module.exports = {
  addVouch,
  getReputation,
  getUserVouches,
  deleteVouch
};
