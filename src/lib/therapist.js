/**
 * Therapist management and appointment scheduling
 */

export const THERAPIST = {
  name: 'Dra. María Torres',
  specialty: 'Terapia del Duelo',
  email: 'maria.torres@sanemos.com',
  phone: '+34 912 345 678',
  bio: 'Especialista en duelo y pérdida con 15 años de experiencia',
};

const APPOINTMENTS_KEY = 'sanemos_appointments';

/**
 * Get available appointment slots for the next 3 business days
 * @returns {Array} Array of available time slots
 */
export function getAvailableSlots() {
  const slots = [];
  const now = new Date();
  let daysAdded = 0;

  while (daysAdded < 3) {
    const date = new Date(now);
    date.setDate(date.getDate() + daysAdded + 1); // Skip today

    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (date.getDay() === 0 || date.getDay() === 6) {
      daysAdded++;
      continue;
    }

    // Add 3 time slots per day: 10:00, 15:00, 17:00
    const times = ['10:00', '15:00', '17:00'];
    times.forEach(time => {
      const [hours, minutes] = time.split(':');
      const slotDate = new Date(date);
      slotDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Only add future slots
      if (slotDate > now) {
        slots.push({
          id: `slot_${slotDate.getTime()}`,
          date: slotDate.toISOString(),
          displayDate: slotDate.toLocaleDateString('es-ES', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          }),
          displayTime: time,
          dateObj: slotDate,
        });
      }
    });

    daysAdded++;
  }

  return slots;
}

/**
 * Book an appointment slot
 * @param {Object} slot - The slot object with date and time info
 * @returns {string} Appointment ID
 */
export function bookAppointment(slot) {
  try {
    const appointments = getAppointments();
    const appointmentId = `appt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const appointment = {
      id: appointmentId,
      therapistId: 'therapist_maria_torres',
      date: slot.date,
      displayDate: slot.displayDate,
      displayTime: slot.displayTime,
      bookedAt: new Date().toISOString(),
      status: 'confirmed',
    };

    appointments.push(appointment);
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
    console.log('Appointment booked:', appointmentId);

    return appointmentId;
  } catch (error) {
    console.error('Error booking appointment:', error);
    throw error;
  }
}

/**
 * Get all booked appointments
 * @returns {Array} Array of appointments
 */
export function getAppointments() {
  try {
    const data = localStorage.getItem(APPOINTMENTS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading appointments:', error);
    return [];
  }
}

/**
 * Cancel an appointment
 * @param {string} appointmentId - ID of appointment to cancel
 */
export function cancelAppointment(appointmentId) {
  try {
    let appointments = getAppointments();
    appointments = appointments.filter(a => a.id !== appointmentId);
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
    console.log('Appointment cancelled:', appointmentId);
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    throw error;
  }
}

/**
 * Get the next upcoming appointment
 * @returns {Object|null} The next appointment or null
 */
export function getNextAppointment() {
  const appointments = getAppointments();
  if (appointments.length === 0) return null;

  const now = new Date();
  const upcoming = appointments
    .filter(a => new Date(a.date) > now && a.status === 'confirmed')
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return upcoming[0] || null;
}

/**
 * Format appointment info for email
 * @param {Object} appointment - The appointment
 * @param {string} sessionSummary - Summary text to include
 * @returns {string} Formatted email body
 */
export function formatAppointmentEmail(appointment, sessionSummary) {
  return `Estimada ${THERAPIST.name},

Le escribo para compartir un resumen de mi sesión anterior como referencia para nuestra próxima cita.

**Resumen de sesión:**
${sessionSummary}

**Cita agendada:**
${appointment.displayDate} a las ${appointment.displayTime}

Saludos,
[Tu nombre]`;
}
