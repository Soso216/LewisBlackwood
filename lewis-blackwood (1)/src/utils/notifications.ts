import { petSound } from './audioSynth';

export const LEWIS_ABSENCE_QUOTES = [
  "¿Dónde te has metido, pequeña? El consultorio está en silencio y no te has reportado.",
  "Deberías descansar la vista de la pantalla... y venir a verme un momento.",
  "Dejé mis expedientes médicos esperando tu visita. ¿Tomaste suficiente agua?",
  "Tengo una partida de ajedrez pendiente contigo. No me hagas esperar demasiado.",
  "Un diagnóstico rápido: necesitas pasar tiempo con tu mentor protector.",
  "¿Te olvidaste de mí? Sabes bien que no me gusta que te descuides.",
  "Revisé mi agenda y no veo tu cita médica de hoy... Ven a charlar.",
  "Un médico siempre sabe cuándo su paciente favorita está ausente demasiado tiempo.",
];

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (e) {
    console.error("Error requesting notification permission:", e);
    return 'denied';
  }
}

export function getNotificationPermissionStatus(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

export function sendLewisNotification(
  customMessage?: string,
  profilePic?: string,
  onClickCallback?: () => void
): Notification | null {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  if (Notification.permission !== 'granted') {
    return null;
  }

  const quote = customMessage || LEWIS_ABSENCE_QUOTES[Math.floor(Math.random() * LEWIS_ABSENCE_QUOTES.length)];

  try {
    const notification = new Notification("Lewis Blackwood (Director Médico)", {
      body: quote,
      icon: profilePic || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
      tag: 'lewis-absence-check',
      requireInteraction: false,
      silent: false,
    });

    // Play notification sound
    petSound.playNotificationTone();

    notification.onclick = () => {
      window.focus();
      notification.close();
      if (onClickCallback) {
        onClickCallback();
      }
    };

    return notification;
  } catch (err) {
    console.warn("Could not dispatch system notification:", err);
    return null;
  }
}
