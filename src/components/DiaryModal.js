import { useState, useEffect } from 'react';
import { loadDiary, deleteDiaryEntry, formatDiaryDate } from '@/lib/diary';
import styles from './DiaryModal.module.css';

export default function DiaryModal({ isOpen, onClose, locale }) {
  const [entries, setEntries] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  // Reload entries every time the modal opens
  useEffect(() => {
    if (isOpen) setEntries(loadDiary());
  }, [isOpen]);

  const isEs = locale === 'es';

  const handleDelete = (id) => {
    if (confirm(isEs ? '¿Eliminar esta entrada?' : 'Delete this entry?')) {
      deleteDiaryEntry(id);
      setEntries(loadDiary());
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>📔 {isEs ? 'Tu Diario' : 'Your Diary'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.content}>
          {entries.length === 0 ? (
            <p className={styles.empty}>
              {isEs ? 'No hay entradas en tu diario aún' : 'No diary entries yet'}
            </p>
          ) : (
            <ul className={styles.entryList}>
              {entries.map((entry) => (
                <li key={entry.id} className={styles.entryItem}>
                  <div
                    className={styles.entryHeader}
                    onClick={() => toggleExpand(entry.id)}
                  >
                    <div className={styles.entryInfo}>
                      <h3>{entry.title}</h3>
                      <span className={styles.date}>{formatDiaryDate(entry.date)}</span>
                      {entry.agentName && (
                        <span className={styles.agent}>Con {entry.agentName}</span>
                      )}
                    </div>
                    <span className={styles.expandIcon}>
                      {expandedId === entry.id ? '▼' : '▶'}
                    </span>
                  </div>

                  {expandedId === entry.id && (
                    <div className={styles.entryBody}>
                      {entry.summary && (
                        <div className={styles.summary}>
                          <p><strong>{isEs ? 'Resumen:' : 'Summary:'}</strong></p>
                          <p>{entry.summary}</p>
                        </div>
                      )}
                      {entry.transcript && entry.transcript.length > 0 && (
                        <div className={styles.transcript}>
                          <p><strong>{isEs ? 'Transcripción:' : 'Transcript:'}</strong></p>
                          <div className={styles.transcriptText}>
                            {entry.transcript.map((msg, i) => (
                              <p key={i} className={msg.sender === 'ai' ? styles.aiMsg : styles.userMsg}>
                                <em>{msg.sender === 'ai' ? 'Agent' : 'You'}:</em> {msg.text}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className={styles.entryFooter}>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(entry.id)}
                        >
                          {isEs ? '🗑️ Eliminar' : '🗑️ Delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
