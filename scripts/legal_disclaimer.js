// EPTEC Haftungsausschluss-Logik

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

    showLegalPlaceholder(type);  // Hier rufen wir die Funktion auf, die den Platzhalter anzeigt
}

// Funktion zur Anzeige der rechtlichen Dokumente
function showLegalPlaceholder(type) {
    let content = "";
    switch (type) {
        case "imprint":
            content = "Hier stehen die Impressumsdetails.";
            break;
        case "privacy":
            content = "Hier sind die Datenschutzbestimmungen.";
            break;
        case "terms":
            content = "Hier sind die Allgemeinen Geschäftsbedingungen (AGB).";
            break;
        case "cookies":
            content = "Hier sind die Cookie-Richtlinien.";
            break;
        default:
            content = "Dokument nicht gefunden.";
            break;
    }

    const placeholderDiv = document.createElement("div");
    placeholderDiv.style.padding = "20px";
    placeholderDiv.style.background = "#f5f5f5";
    placeholderDiv.style.borderRadius = "8px";
    placeholderDiv.innerHTML = `
        <h2>Rechtliche Informationen</h2>
        <p>${content}</p>
        <button onclick="closeLegal()">Schließen</button>
    `;

    // Anzeigen der Platzhalter-Inhalte
    document.body.appendChild(placeholderDiv);
}

// Funktion zum Schließen der rechtlichen Anzeige
function closeLegal() {
    const legalPlaceholder = document.querySelector("div[style*='padding: 20px']");
    if (legalPlaceholder) {
        legalPlaceholder.remove();
    }
}
