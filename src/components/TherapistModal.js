import { THERAPIST } from '@/lib/therapist';
import styles from './TherapistModal.module.css';

export default function TherapistModal({ isOpen, onClose, summaryText, locale, setUiToast }) {
  const isEs = locale === 'es';

  if (!isOpen) return null;

  const handleCopyForEmail = () => {
    const emailBody = `Estimada ${THERAPIST.name},

Le escribo para compartir un resumen de mi sesión anterior como referencia para nuestra próxima cita.

**Resumen de sesión:**
${summaryText || '(Sin resumen disponible)'}

Saludos,
[Tu nombre]`;

    navigator.clipboard.writeText(emailBody);
    if (setUiToast) {
      setUiToast(isEs ? '📋 Texto copiado al portapapeles' : '📋 Text copied to clipboard');
      setTimeout(() => setUiToast(null), 3000);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>👩‍⚕️ {THERAPIST.name}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.content}>
          <div className={styles.therapistInfo}>
            <p className={styles.specialty}>
              <strong>{isEs ? 'Especialidad:' : 'Specialty:'}</strong> {THERAPIST.specialty}
            </p>
            <p>
              <strong>{isEs ? 'Teléfono:' : 'Phone:'}</strong> {THERAPIST.phone}
            </p>
            <p>
              <strong>{isEs ? 'Email:' : 'Email:'}</strong> {THERAPIST.email}
            </p>
            <p className={styles.bio}>{THERAPIST.bio}</p>
          </div>

          {summaryText && (
            <div className={styles.summarySection}>
              <h3>{isEs ? 'Resumen de tu sesión:' : 'Your session summary:'}</h3>
              <div className={styles.summaryText}>
                {summaryText}
              </div>
            </div>
          )}

          <div className={styles.actions}>
            <button className={styles.copyBtn} onClick={handleCopyForEmail}>
              📋 {isEs ? 'Copiar para email' : 'Copy for email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
