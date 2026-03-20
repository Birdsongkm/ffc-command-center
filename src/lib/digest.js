/**
 * Builds the text summary for the Monday digest audio/text briefing.
 */
function buildDigestText(unreadCount, needsResponseEmails, weekEvents, financeAlerts) {
  let text = '';

  if (unreadCount > 0) {
    text += `You have ${unreadCount} unread email${unreadCount !== 1 ? 's' : ''}. `;
  }

  if (needsResponseEmails.length > 0) {
    text += `${needsResponseEmails.length} need${needsResponseEmails.length !== 1 ? '' : 's'} your reply. `;
  }

  if (weekEvents.length > 0) {
    text += `${weekEvents.length} meeting${weekEvents.length !== 1 ? 's' : ''} this week. `;
  }

  if (financeAlerts.length > 0) {
    const latestAlert = financeAlerts[0];
    text += `${latestAlert.from.split('<')[0].trim()} sent: "${latestAlert.subject}".`;
  }

  return text.trim();
}

module.exports = { buildDigestText };
