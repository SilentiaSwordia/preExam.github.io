// ==========================================
// 1. KONFIGURASJON & OPPSETT
// ==========================================
// Dekker mål: "Modellere og opprette databaser" & "Skytjenester"
const supabaseUrl = "https://bgbgyjtxpulftottqklk.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnYmd5anR4cHVsZnRvdHRxa2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNzA1MzAsImV4cCI6MjA4Mzg0NjUzMH0.hZ-ZGdqvdNCBsNmn10lmqCcrgbCsPZYyJuty667VOrU";
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. AUTENTISERING (Brukes i index.html)
// ==========================================
// Dekker mål: "Administrere brukere, tilganger og rettigheter"

// Registrering av ny bruker
async function handleSignUp() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const msg = document.getElementById("auth-message");

  const { data, error } = await _supabase.auth.signUp({ email, password });

  if (error) {
    msg.innerText = "Feil: " + error.message;
    msg.style.color = "red";
  } else {
    msg.innerText = "Suksess! Sjekk e-posten din for bekreftelse.";
    msg.style.color = "green";
  }
}

// Innlogging
async function handleLogin() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const msg = document.getElementById("auth-message");

  const { data, error } = await _supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    msg.innerText = "Feil: " + error.message;
    msg.style.color = "red";
  } else {
    window.location.href = "dashboard.html"; // Sender brukeren til dashboardet
  }
}

// Logg ut (Brukes på dashboard.html)
async function handleLogout() {
  await _supabase.auth.signOut();
  window.location.href = "index.html";
}

// ==========================================
// 3. DATAHÅNDTERING (Brukes i dashboard.html)
// ==========================================
// Dekker mål: "Anvende relevante programmeringsspråk og algoritmer"

// Hente utstyr fra databasen
async function hentUtstyr() {
  const { data, error } = await _supabase
    .from("utstyr")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Kunne ikke hente data:", error);
  } else {
    visUtstyr(data);
  }
}

// Legge til nytt utstyr
async function leggTilUtstyr() {
  const navn = document.getElementById("navn").value;
  const type = document.getElementById("type").value;
  const sn = document.getElementById("sn").value;

  // 1. Hent den innloggede brukeren fra Supabase Auth
  const {
    data: { user },
  } = await _supabase.auth.getUser();

  if (!user) {
    alert("Du må være logget inn for å registrere utstyr!");
    return;
  }

  // 2. Send data, inkludert brukerens UUID (user.id)
  const { error } = await _supabase.from("utstyr").insert([
    {
      navn: navn,
      type: type,
      serienummer: sn,
      status: "Ledig",
      ansvarlig_bruker: user.id, // Her legger vi inn UUID-en
    },
  ]);

  if (error) {
    alert("Feil: " + error.message);
  } else {
    // Tøm feltene og oppdater
    document.getElementById("navn").value = "";
    document.getElementById("type").value = "";
    document.getElementById("sn").value = "";
    hentUtstyr();
  }
}
// Algoritme for å tegne tabellen i HTML
// Dekker mål: "Vurdere brukergrensesnitt og designe tjenester"
function visUtstyr(utstyrsListe) {
  const beholder = document.getElementById("utstyr-liste");

  if (utstyrsListe.length === 0) {
    beholder.innerHTML = "<p>Ingen utstyr funnet i databasen.</p>";
    return;
  }

  let html = `
        <table>
            <thead>
                <tr>
                    <th>Navn</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Serienummer</th>
                </tr>
            </thead>
            <tbody>
    `;

  utstyrsListe.forEach((enhet) => {
    const statusKlasse =
      enhet.status === "Ledig" ? "status-gronn" : "status-rod";
    const knappTekst = enhet.status === "Ledig" ? "Sjekk ut" : "Lever inn";

    html += `
        <tr>
            <td>${enhet.navn}</td>
            <td>${enhet.type}</td>
            <td><span class="${statusKlasse}">${enhet.status}</span></td>
            <td>${enhet.serienummer || "---"}</td>
            <td>
                <button onclick="endreStatus(${enhet.id}, '${
      enhet.status
    }')" class="btn-status">
                    ${knappTekst}
                </button>
            </td>
        </tr>
    `;
  });

  html += `</tbody></table>`;
  beholder.innerHTML = html;
}

async function endreStatus(id, nåværendeStatus) {
  // Bestem hva den nye statusen skal være
  const nyStatus = nåværendeStatus === "Ledig" ? "I bruk" : "Ledig";

  const { error } = await _supabase
    .from("utstyr")
    .update({ status: nyStatus })
    .eq("id", id);

  if (error) {
    alert("Kunne ikke endre status: " + error.message);
  } else {
    // Oppdater tabellen på skjermen med en gang
    hentUtstyr();
  }
}

// ==========================================
// 4. SIDE-KONTROLLØREN (Kjøres ved oppstart)
// ==========================================
// Dekker mål: "Planlegge og dokumentere IT-løsninger"

// Denne sjekker hvilken side du er på ved å se etter ID-er i HTML-en
window.onload = () => {
  // Sjekk om vi er på index.html
  if (document.getElementById("auth-container")) {
    console.log("Logikk for autentisering klar.");
  }

  // Sjekk om vi er på dashboard.html
  if (document.getElementById("utstyr-liste")) {
    console.log("Logikk for dashboard klar.");
    hentUtstyr();
  }
};
