import { useState, useEffect } from 'react';
import { getAppointments, cancelAppointment, THERAPIST } from '@/lib/therapist';
import styles from './DiaryModal.module.css';

export default function AppointmentsViewModal({ isOpen, onClose, locale }) {
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    if (isOpen) setAppointments(getAppointments());
  }, [isOpen]);

  const isEs = locale === 'es';

  const handleCancel = (id) => {
    if (confirm(isEs ? '¿Cancelar esta cita?' : 'Cancel this appointment?')) {
      cancelAppointment(id);
      setAppointments(getAppointments());
    }
  };

  const isPast = (dateStr) => new Date(dateStr) < new Date();

  if (!isOpen) return null;

  const upcoming = appointments.filter(a => !isPast(a.date) && a.status === 'confirmed');
  const past = appointments.filter(a => isPast(a.date) || a.status !== 'confirmed');

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>📅 {isEs ? 'Mis Citas' : 'My Appointments'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.content}>
          {appointments.length === 0 ? (
            <p className={styles.empty}>
              {isEs ? 'No tienes citas agendadas' : 'No appointments scheduled'}
            </p>
          ) : (
            <>
              {upcoming.length > 0 && (
                <ul className={styles.entryList}>
                  {upcoming.map((appt) => (
                    <li key={appt.id} className={styles.entryItem}>
                      <div className={styles.entryHeader}>
                        <div className={styles.entryInfo}>
                          <h3>{THERAPIST.name}</h3>
                          <span className={styles.date}>
                            {appt.displayDate} — {appt.displayTime}
                          </span>
                          <span className={styles.agent}>
                            {isEs ? 'Confirmada' : 'Confirmed'}
                          </span>
                        </div>
                      </div>
                      <div className={styles.entryBody}>
                        <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#555' }}>
                          {THERAPIST.specialty} · {THERAPIST.email}
                        </p>
                        <div className={styles.entryFooter}>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleCancel(appt.id)}
                          >
                            {isEs ? '✕ Cancelar cita' : '✕ Cancel appointment'}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {past.length > 0 && (
                <>
                  <p style={{ fontSize: '0.85rem', color: '#999', marginTop: upcoming.length > 0 ? '16px' : '0', marginBottom: '8px' }}>
                    {isEs ? 'Pasadas' : 'Past'}
                  </p>
                  <ul className={styles.entryList}>
                    {past.map((appt) => (
                      <li key={appt.id} className={styles.entryItem} style={{ opacity: 0.6 }}>
                        <div className={styles.entryHeader}>
                          <div className={styles.entryInfo}>
                            <h3>{THERAPIST.name}</h3>
                            <span className={styles.date}>
                              {appt.displayDate} — {appt.displayTime}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
