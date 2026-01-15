// EPTEC Benachrichtigungs-Dienst
const NotificationService = {
    triggerAlert: (type, message) => {
        const timestamp = new Date().toLocaleString();
        console.log(`[${timestamp}] ALERT (${type}): ${message}`);
        
        // In der echten App würde hier die E-Mail oder Push-Nachricht versendet
        return `Notification_Sent_to_User`;
    },
    
    scheduleReminder: (days) => {
        console.log(`Erinnerung wurde für in ${days} Tagen geplant.`);
    }
};
