const db = require('./db');

// Create or open a new ModMail ticket
function createTicket({ ticketId, userId, guildId, channelId, threadId = null, categoryId = null }) {
  const ticket = {
    ticketId,
    userId,
    guildId,
    channelId,
    threadId: threadId || channelId,
    categoryId,
    status: 'open',
    messagesCount: 1,
    isAnonymous: false,
    transcript: [],
    createdAt: Math.floor(Date.now() / 1000),
    lastMessageAt: Math.floor(Date.now() / 1000)
  };
  db.tickets[ticketId] = ticket;
  db.save('tickets');
  return ticket;
}

// Find open ticket by channel or thread ID
function getTicketByChannel(channelId) {
  return Object.values(db.tickets).find(
    t => (t.channelId === channelId || t.threadId === channelId) && t.status === 'open'
  ) || null;
}

// Find open ticket by Discord thread ID (backward compatibility)
function getTicketByThread(threadId) {
  return getTicketByChannel(threadId);
}

// Find active ticket for a specific user ID
function getActiveTicketByUser(userId) {
  return Object.values(db.tickets).find(t => t.userId === userId && t.status === 'open') || null;
}

// Add message to transcript
function addTranscriptMessage(ticketId, { author, content, isStaff = false }) {
  const ticket = db.tickets[ticketId];
  if (!ticket) return;

  if (!ticket.transcript) ticket.transcript = [];
  ticket.transcript.push({
    author,
    content,
    isStaff,
    timestamp: Math.floor(Date.now() / 1000)
  });
  ticket.messagesCount = ticket.transcript.length;
  ticket.lastMessageAt = Math.floor(Date.now() / 1000);
  db.save('tickets');
}

// Toggle anonymous mode for staff replies in this ticket
function toggleAnonymous(ticketId) {
  const ticket = db.tickets[ticketId];
  if (!ticket) return false;
  ticket.isAnonymous = !ticket.isAnonymous;
  db.save('tickets');
  return ticket.isAnonymous;
}

// Close an active ticket
function closeTicket(ticketId, reason = 'Resolved', closedBy = 'Staff') {
  const ticket = db.tickets[ticketId];
  if (!ticket) return null;

  ticket.status = 'closed';
  ticket.closeReason = reason;
  ticket.closedBy = closedBy;
  ticket.closedAt = Math.floor(Date.now() / 1000);

  db.save('tickets');
  return ticket;
}

// Get all currently active tickets
function getAllActiveTickets() {
  return Object.values(db.tickets).filter(t => t.status === 'open');
}

module.exports = {
  createTicket,
  getTicketByChannel,
  getTicketByThread,
  getActiveTicketByUser,
  addTranscriptMessage,
  toggleAnonymous,
  closeTicket,
  getAllActiveTickets
};
