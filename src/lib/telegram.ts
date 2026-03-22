const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

interface TelegramNotificationOptions {
    entityType: 'client' | 'estimate' | 'invoice' | 'folder' | 'system';
    waveId?: string;
    message: string;
}

/**
 * Sends a notification to the configured Telegram bot.
 */
export async function sendTelegramNotification({
    entityType,
    waveId,
    message,
}: TelegramNotificationOptions): Promise<void> {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error('Missing Telegram environment variables');
        return;
    }

    const text = `
⚠️ *LaederPortal Alert*
*Entity:* ${entityType.toUpperCase()}
${waveId ? `*Wave ID:* ${waveId}` : ''}
*Message:* ${message}
  `.trim();

    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text,
                parse_mode: 'Markdown',
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to send Telegram notification:', errorData);
        }
    } catch (error) {
        console.error('Error sending Telegram notification:', error);
    }
}
