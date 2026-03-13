import { useState } from 'react';
import { getAvailableSlots, bookAppointment } from '@/lib/therapist';
import styles from './AppointmentModal.module.css';

export default function AppointmentModal({ isOpen, onClose, locale, onBooking }) {
  const [slots] = useState(() => getAvailableSlots());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const isEs = locale === 'es';

  const handleConfirm = () => {
    if (selectedSlot) {
      bookAppointment(selectedSlot);
      setConfirmed(true);
      setTimeout(() => {
        if (onBooking) onBooking();
        onClose();
        setConfirmed(false);
        setSelectedSlot(null);
      }, 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>📅 {isEs ? 'Agendar Cita' : 'Book Appointment'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.content}>
          {confirmed ? (
            <div className={styles.confirmation}>
              <div className={styles.checkmark}>✓</div>
              <h3>{isEs ? '¡Cita Agendada!' : 'Appointment Booked!'}</h3>
              <p>
                {isEs ? 'Tu cita ha sido confirmada.' : 'Your appointment has been confirmed.'}
              </p>
            </div>
          ) : (
            <>
              <p className={styles.instruction}>
                {isEs ? 'Selecciona un horario disponible:' : 'Select an available time:'}
              </p>
              <div className={styles.slotsGrid}>
                {slots.map((slot) => (
                  <button
                    key={slot.id}
                    className={`${styles.slotButton} ${
                      selectedSlot?.id === slot.id ? styles.selected : ''
                    }`}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    <div className={styles.slotDate}>{slot.displayDate}</div>
                    <div className={styles.slotTime}>{slot.displayTime}</div>
                  </button>
                ))}
              </div>

              {selectedSlot && (
                <div className={styles.confirmSection}>
                  <p className={styles.confirmText}>
                    {isEs ? 'Confirmar cita el ' : 'Confirm appointment on '}
                    <strong>
                      {selectedSlot.displayDate} {isEs ? 'a las' : 'at'} {selectedSlot.displayTime}
                    </strong>
                  </p>
                  <button
                    className={styles.confirmBtn}
                    onClick={handleConfirm}
                  >
                    {isEs ? '✓ Confirmar' : '✓ Confirm'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
