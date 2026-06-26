// src/utils/whatsapp.js

export const sendWhatsAppMessage = async (target, message) => {
  const token = import.meta.env.VITE_FONNTE_TOKEN;

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        target: target,
        message: message,
      }),
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.reason || 'Failed to send message');
    }

    console.log('WhatsApp message queued successfully:', data);
    return data;

  } catch (error) {
    console.error('WhatsApp API Error:', error.message);
    // Here you could add a call to log this error to Supabase
    throw error;
  }
};