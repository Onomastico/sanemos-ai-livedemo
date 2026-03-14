/**
 * Diary management utilities
 * Stores personal diary entries with session data
 */

const DIARY_KEY = 'sanemos_diary';

/**
 * Load all diary entries from localStorage
 * @returns {Array} Array of diary entries sorted by date descending
 */
export function loadDiary() {
  try {
    const data = localStorage.getItem(DIARY_KEY);
    if (!data) return [];
    const entries = JSON.parse(data);
    // Sort by date descending (newest first)
    return entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    console.error('Error loading diary:', error);
    return [];
  }
}

/**
 * Save a new diary entry
 * @param {string} title - Entry title
 * @param {string} agentName - Name of the agent in this session
 * @param {string} agentId - ID of the agent
 * @param {string} summary - Session summary
 * @param {Array} emotionTimeline - Array of emotion data points
 * @param {Array} messages - Session messages/transcript
 * @returns {string} ID of the saved entry
 */
export function saveDiaryEntry({ title, agentName, agentId, summary, emotionTimeline, messages }) {
  try {
    const entries = loadDiary();
    const id = `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date = new Date().toISOString();

    const newEntry = {
      id,
      date,
      title: title || `Session con ${agentName}`,
      agentName,
      agentId,
      summary,
      emotionTimeline: emotionTimeline || [],
      transcript: messages || [],
    };

    entries.push(newEntry);
    localStorage.setItem(DIARY_KEY, JSON.stringify(entries));
    console.log('Diary entry saved:', id);
    return id;
  } catch (error) {
    console.error('Error saving diary entry:', error);
    throw error;
  }
}

/**
 * Delete a diary entry by ID
 * @param {string} id - Entry ID to delete
 */
export function deleteDiaryEntry(id) {
  try {
    let entries = loadDiary();
    entries = entries.filter(e => e.id !== id);
    localStorage.setItem(DIARY_KEY, JSON.stringify(entries));
    console.log('Diary entry deleted:', id);
  } catch (error) {
    console.error('Error deleting diary entry:', error);
    throw error;
  }
}

/**
 * Get a single diary entry by ID
 * @param {string} id - Entry ID
 * @returns {Object|null} The entry or null if not found
 */
export function getDiaryEntry(id) {
  const entries = loadDiary();
  return entries.find(e => e.id === id) || null;
}

/**
 * Format a date for display
 * @param {string|Date} date - ISO date string or Date object
 * @returns {string} Formatted date string
 */
export function formatDiaryDate(date, locale = 'es') {
  const d = new Date(date);
  const loc = locale === 'en' ? 'en-US' : 'es-ES';
  const time = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return `${locale === 'en' ? 'Today' : 'Hoy'}, ${time}`;
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return `${locale === 'en' ? 'Yesterday' : 'Ayer'}, ${time}`;
  }

  const dateStr = d.toLocaleDateString(loc, { month: 'short', day: 'numeric' });
  return `${dateStr}, ${time}`;
}
