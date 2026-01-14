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
      navn: document.getElementById("navn").value,
      type: document.getElementById("type").value,
      serienummer: document.getElementById("sn").value,
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
  const nyStatus = nåværendeStatus === "Ledig" ? "I bruk" : "Ledig";
  const handling = nyStatus === "I bruk" ? "Sjekket ut" : "Levert inn";

  // 1. Forsøk å oppdatere selve utstyret først
  const {
    data,
    error: updateError,
    status,
  } = await _supabase
    .from("utstyr")
    .update({ status: nyStatus })
    .eq("id", id)
    .select(); // Vi legger til .select() for å bekrefte at noe ble endret

  // 2. Sjekk om oppdateringen faktisk ble utført
  // Hvis brukeren ikke har RLS-tilgang, vil 'data' være tom, eller vi får en feil.
  if (updateError || !data || data.length === 0) {
    console.error("Oppdatering avvist av RLS eller feil:", updateError);
    alert("Du har ikke rettigheter til å endre status på dette utstyret.");
    return; // AVSLUTT HER – koden under (loggingen) vil aldri kjøre
  }

  // 3. HVIS vi kom hit, betyr det at oppdateringen var vellykket.
  // NÅ kan vi logge handlingen.
  const {
    data: { user },
  } = await _supabase.auth.getUser();

  const { error: logError } = await _supabase
    .from("utstyr_logg")
    .insert([{ utstyr_id: id, bruker_id: user.id, handling: handling }]);

  if (logError) {
    console.error("Kunne ikke lagre i logg:", logError.message);
  }

  // 4. Oppdater visningen på nettsiden
  hentUtstyr();

  // Sjekk om hentLogg eksisterer (hvis man er admin) før den kalles
  if (typeof hentLogg === "function") {
    hentLogg();
  }
}

async function hentLogg() {
  // 1. Sjekk først om brukeren i det hele tatt er admin
  const {
    data: { user },
  } = await _supabase.auth.getUser();
  const { data: profil } = await _supabase
    .from("profiler")
    .select("er_admin")
    .eq("id", user.id)
    .single();

  if (!profil || !profil.er_admin) {
    document.getElementById("logg-panel").style.display = "none";
    return; // Avslutt funksjonen hvis brukeren ikke er admin
  }

  // 2. Hent loggen med "joins" til både utstyr og profiler (for å få e-post)
  const { data, error } = await _supabase
    .from("utstyr_logg")
    .select(
      `
            handling,
            tidspunkt,
            utstyr ( navn ),
            profiler ( email )
        `
    )
    .order("tidspunkt", { ascending: false });

  if (error) {
    console.error("Logg-feil:", error.message);
    return;
  }

  let html = `
        <table class="logg-tabell">
            <thead>
                <tr>
                    <th>Tidspunkt</th>
                    <th>Utstyr</th>
                    <th>Handling</th>
                    <th>Utført av</th>
                </tr>
            </thead>
            <tbody>
    `;

  data.forEach((innslag) => {
    const dato = new Date(innslag.tidspunkt).toLocaleString("no-NO");

    // Vi bruker 'innslag.profiler' fordi det er navnet på tabellen vi joiner med
    // Sjekk om objektet eksisterer, hvis ikke bruk en nødløsning
    let brukerInfo = "Ukjent bruker";

    if (innslag.profiler && innslag.profiler.email) {
      brukerInfo = innslag.profiler.email;
    } else {
      // Hvis vi har en bruker_id i loggen, men ingen profil, skriv ID-en så vi kan feilsøke
      brukerInfo =
        "Mangler profil (" + innslag.bruker_id.substring(0, 5) + "...)";
    }

    html += `
        <tr>
            <td>${dato}</td>
            <td>${innslag.utstyr ? innslag.utstyr.navn : "Slettet"}</td>
            <td>${innslag.handling}</td>
            <td>${brukerInfo}</td>
        </tr>
    `;
  });

  html += `</tbody></table>`;
  document.getElementById("logg-liste").innerHTML = html;
  document.getElementById("logg-panel").style.display = "block";
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
  // Legg til dette nederst i script.js i side-kontrolløren
  if (document.getElementById("utstyr-liste")) {
    hentUtstyr();

    // Sjekk om brukeren er admin og skjul skjemaet hvis ikke
    sjekkAdminStatus();
  }

  async function sjekkAdminStatus() {
    const {
      data: { user },
    } = await _supabase.auth.getUser();

    // Hvis ingen er logget inn, skjul alt og avslutt
    if (!user) {
      document.querySelector(".admin-panel").style.display = "none";
      document.getElementById("logg-panel").style.display = "none";
      return;
    }

    // 1. VIS ALLTID panelet for å legge til utstyr for innloggede brukere
    const adminPanel = document.querySelector(".admin-panel");
    if (adminPanel) adminPanel.style.display = "block";

    // 2. Sjekk om brukeren er admin i databasen
    const { data: profil } = await _supabase
      .from("profiler")
      .select("er_admin")
      .eq("id", user.id)
      .single();

    const loggPanel = document.getElementById("logg-panel");

    if (profil && profil.er_admin === true) {
      console.log("Status: ADMIN bekreftet");

      // Vis logg-panelet kun for admin
      if (loggPanel) loggPanel.style.display = "block";

      // Hent loggen
      hentLogg();

      document.getElementById("user-display").innerText =
        "Logget inn som: Admin";
    } else {
      console.log("Status: Standard bruker");

      // Skjul logg-panelet for vanlige brukere
      if (loggPanel) loggPanel.style.display = "none";

      document.getElementById("user-display").innerText =
        "Logget inn som: Bruker";
    }
  }
};
