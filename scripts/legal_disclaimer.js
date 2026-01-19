function showLegalDisclaimer() {
    const disclaimerText = "HINWEIS: EPTEC stellt Expertise und Infrastruktur bereit. " +
                           "Dies ist keine Rechtsberatung. Mit Klick auf 'Fortfahren' " +
                           "bestätigen Sie, dass Sie die Ampel-Entscheidung und " +
                           "die daraus folgende Eskalation eigenverantwortlich treffen. " +
                           "Bitte nehmen Sie auch zur Kenntnis, dass der Datenschutz gemäß " +
                           "<a href='#' onclick='openLegal(\"privacy\")'>Datenschutzbestimmungen</a> " +
                           "gewährleistet wird und die <a href='#' onclick='openLegal(\"terms\")'>AGB</a> gelten.";

    // Anzeige einer Checkbox und des Textes
    const container = document.createElement("div");
    container.innerHTML = `
        <div style="font-size: 16px; margin-bottom: 20px;">
            ${disclaimerText}
        </div>
        <div>
            <label>
                <input type="checkbox" id="legal-checkbox"> Ich habe die AGBs und Datenschutzbestimmungen gelesen und akzeptiere sie.
            </label>
        </div>
    `;
    
    // Fügt das Popup zur Seite hinzu
    const popup = document.createElement("div");
    popup.classList.add("legal-popup");
    popup.appendChild(container);

    // Button für Bestätigung
    const button = document.createElement("button");
    button.textContent = "Fortfahren";
    button.disabled = true; // Erst wenn die Checkbox angeklickt wurde
    button.onclick = () => {
        const isAccepted = document.getElementById("legal-checkbox").checked;
        if (isAccepted) {
            console.log("Nutzer hat Disclaimer akzeptiert. Eskalation freigeschaltet.");
            popup.remove();
            return true;
        } else {
            console.log("Eskalation durch Nutzer abgebrochen.");
            alert("Bitte stimmen Sie den AGBs und Datenschutzbestimmungen zu.");
            return false;
        }
    };

    // Checkbox Status überwachen
    document.getElementById("legal-checkbox").addEventListener("change", () => {
        button.disabled = !document.getElementById("legal-checkbox").checked;
    });

    container.appendChild(button);
    document.body.appendChild(popup);
}

// Funktion zum Öffnen der rechtlichen Seiten
function openLegal(type) {
    const supported = ["imprint", "privacy", "terms", "cookies"];
    if (!supported.includes(type)) return;

    // Öffne das entsprechende Dokument
    showLegalPlaceholder(type);  // Hier kannst du das Dokument je nach Typ anzeigen
}
