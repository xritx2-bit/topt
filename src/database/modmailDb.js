const db = require('./db');

// Create or open a new ModMail ticket
function createTicket({ ticketId, userId, guildId, channelId, threadId }) {
  const ticket = {
    ticketId,
    userId,
    guildId,
    channelId,
    threadId,
    status: 'open',
    messagesCount: 1,
    createdAt: Math.floor(Date.now() / 1000),
    lastMessageAt: Math.floor(Date.now() / 1000)
  };
  db.tickets[ticketId] = ticket;
  db.save('tickets');
  return ticket;
}

// Find open ticket by Discord thread ID
function getTicketByThread(threadId) {
  return Object.values(db.tickets).find(t => t.threadId === threadId && t.status === 'open') || null;
}

// Find active ticket for a specific user ID
function getActiveTicketByUser(userId) {
  return Object.values(db.tickets).find(t => t.userId === userId && t.status === 'open') || null;
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
  getTicketByThread,
  getActiveTicketByUser,
  closeTicket,
  getAllActiveTickets
};
