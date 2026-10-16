export function getChatbotSessionId(): string {
  const key = 'rhema_chatbot_session';
  let sessionId = window.sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = window.crypto.randomUUID();
    window.sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
}
