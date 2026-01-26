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

// Nesten alt under her er copy/paste fra Gemini fordi jeg ikke hadde peiling på hvordan jeg skulle gjøre dette selv.
// Det handler om at jeg har satt flere tabeller inn som linker til Supabase og at jeg ikke helt forstod hvordan jeg skulle få det til å fungere med autentisering og RLS.
// Hente utstyr fra databasen
let visUtlaanstidAdmin = false; // Global variabel for å kontrollere admin-kolonnen
async function hentUtstyr() {
  // Vi sjekker om vi skal bruke admin-viewen eller den vanlige tabellen
  const kilde = visUtlaanstidAdmin ? "admin_utstyr_oversikt" : "utstyr";

  const { data, error } = await _supabase
    .from(kilde)
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

  // Overskrifter - vi legger til "Total tid" hvis admin-visning er på
  let html = `
        <table>
            <thead>
                <tr>
                    <th>Navn</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Serienummer</th>
                    ${visUtlaanstidAdmin ? "<th>Tid utlånt (Simulert)</th>" : ""}
                    <th>Handling</th>
                </tr>
            </thead>
            <tbody>
    `;

  utstyrsListe.forEach((enhet) => {
    const statusKlasse =
      enhet.status === "Ledig" ? "status-gronn" : "status-rod";
    const knappTekst = enhet.status === "Ledig" ? "Sjekk ut" : "Lever inn";

    // Beregn tid kun hvis kolonnen er aktivert
    let tidHtml = "";
    if (visUtlaanstidAdmin) {
      const dager =
        enhet.status === "I bruk"
          ? (Number.parseInt(enhet.dager_utlaant) || 0) + 14
          : "---";
      tidHtml = `<td>${dager} ${enhet.status === "I bruk" ? "dager" : ""}</td>`;
    }

    html += `
        <tr>
            <td>${enhet.navn}</td>
            <td>${enhet.type}</td>
            <td><span class="${statusKlasse}">${enhet.status}</span></td>
            <td>${enhet.serienummer || "---"}</td>
            ${tidHtml}
            <td>
                <button onclick="endreStatus(${enhet.id}, '${enhet.status}')" class="btn-status">
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
  console.log("Starter endring for enhet ID:", id);

  // 1. Hent informasjon om den innloggede brukeren
  const {
    data: { user },
  } = await _supabase.auth.getUser();
  if (!user) return alert("Du må være logget inn for å gjøre dette!");

  // 2. Sjekk om brukeren er admin
  const { data: profil } = await _supabase
    .from("profiler")
    .select("er_admin")
    .eq("id", user.id)
    .single();

  const erAdmin = profil?.er_admin || false;

  // 3. Hent informasjon om hvem som har lånt utstyret akkurat nå
  const { data: enhet } = await _supabase
    .from("utstyr")
    .select("laant_av")
    .eq("id", id)
    .single();

  // 4. SIKKERHETSSJEKK: Kun tillat innlevering hvis man er låntaker eller admin
  if (nåværendeStatus !== "Ledig") {
    if (enhet.laant_av !== user.id && !erAdmin) {
      alert(
        "Tilgang nektet: Kun administrator eller den som lånte utstyret kan levere det inn.",
      );
      return; // Stopper funksjonen her
    }
  }

  // 5. Definer nye verdier for oppdatering
  const nyStatus = nåværendeStatus === "Ledig" ? "I bruk" : "Ledig";
  const hvemHarDen = nyStatus === "I bruk" ? user.id : null;
  const handling = nyStatus === "I bruk" ? "Sjekket ut" : "Levert inn";

  // 6. UTFØR OPPDATERINGEN I SUPABASE
  const { data, error: updateError } = await _supabase
    .from("utstyr")
    .update({
      status: nyStatus,
      laant_av: hvemHarDen,
    })
    .eq("id", id)
    .select(); // .select() sikrer at vi får bekreftelse tilbake

  // Sjekk om oppdateringen ble avvist av RLS eller feilet
  if (updateError || !data || data.length === 0) {
    console.error("Oppdatering feilet:", updateError);
    alert("Kunne ikke oppdatere databasen. Sjekk tilganger (RLS).");
    return;
  }

  // 7. LOGGFØR HANDLINGEN
  const { error: logError } = await _supabase
    .from("utstyr_logg")
    .insert([{ utstyr_id: id, bruker_id: user.id, handling: handling }]);

  if (logError) console.error("Kunne ikke lagre i logg:", logError.message);

  // 8. AUTOMATISK OPPDATERING AV GRENSESNITTET
  console.log("Oppdatering vellykket! Henter ferske data...");

  // Vi bruker await for å sikre at vi henter data ETTER at endringen er lagret
  await hentUtstyr();

  // Oppdaterer admin-paneler hvis de er synlige
  if (typeof hentLogg === "function") hentLogg();
  if (typeof oppdaterPurreVisning === "function") oppdaterPurreVisning();
}

async function hentLogg() {
  const { data, error } = await _supabase
    .from("utstyr_logg")
    .select(
      `
            handling,
            tidspunkt,
            utstyr ( navn ),
            profiler ( email )
        `,
    )
    .order("tidspunkt", { ascending: false });

  // FEILSØKING: Hvis tabellen ikke dukker opp, sjekk hva som står i konsollen her:
  if (error) {
    console.error("LOGG-FEIL DETALJER:", error.message);
    document.getElementById("logg-liste").innerHTML =
      "<p style='color:red'>Kunne ikke laste logg: " + error.message + "</p>";
    return;
  }

  if (!data || data.length === 0) {
    document.getElementById("logg-liste").innerHTML =
      "<p>Ingen historikk funnet.</p>";
    return;
  }

  let html = `<table><thead><tr><th>Tidspunkt</th><th>Utstyr</th><th>Handling</th><th>Bruker</th></tr></thead><tbody>`;

  data.forEach((innslag) => {
    const dato = new Date(innslag.tidspunkt).toLocaleString("no-NO");

    // Sjekk nøye om profiler finnes før vi prøver å lese email
    // Vi bruker ?. for å unngå at koden krasjer (Optional Chaining)
    const epost = innslag.profiler?.email || "Ukjent (mangler i profil)";
    const utstyrNavn = innslag.utstyr?.navn || "Slettet utstyr";

    html += `
            <tr>
                <td>${dato}</td>
                <td>${utstyrNavn}</td>
                <td>${innslag.handling}</td>
                <td>${epost}</td>
            </tr>
        `;
  });

  html += `</tbody></table>`;
  document.getElementById("logg-liste").innerHTML = html;
}

async function sendPurreEpost(mottakerEpost, navnPaautstyr) {
  console.log("Sender purring til:", mottakerEpost, "for:", navnPaautstyr);

  const { data, error } = await _supabase.functions.invoke(
    "Varsel-om-utl-nstid",
    {
      body: {
        email: mottakerEpost, // Må matche interfacet i TypeScript
        utstyrNavn: navnPaautstyr,
      },
    },
  );

  if (error) {
    console.error("Detaljert feil fra Edge Function:", error);
    alert("Kunne ikke sende e-post. Sjekk konsollen.");
  } else {
    alert("Suksess! Purring sendt til " + mottakerEpost);
  }
}

async function simulerGammeltUtlaan(id) {
  const { error } = await _supabase.rpc("jukse_med_tiden", { utstyr_id: id });
  if (error) console.error(error);
  else {
    alert(
      "Suksess! Dette utstyret er nå registrert som utlånt for 15 dager siden.",
    );
    hentUtstyr();
    if (typeof oppdaterPurreVisning === "function") oppdaterPurreVisning();
  }
}

async function oppdaterPurreVisning() {
  const { data, error } = await _supabase.from("utstyr_over_frist").select("*");

  if (error) {
    console.error("Feil ved henting av purredata:", error);
    return;
  }

  const purreListe = document.getElementById("purre-liste");

  if (data && data.length > 0) {
    let html =
      '<table style="width:100%; border-collapse: collapse; margin-top: 10px; font-size: 0.9em;">';
    html +=
      '<tr style="border-bottom: 2px solid red;"><th>Utstyr</th><th>Serienummer</th><th>Lånt av</th><th>Total tid</th></tr>';

    data.forEach((item) => {
      const faktiskeDager = Number.parseInt(item.dager_utlaant) || 0;
      const demoDager = faktiskeDager + 14;
      const sn = item.serienummer || "Mangler S/N";
      // Inni data.forEach i oppdaterPurreVisning:
      html += `
    <tr style="border-bottom: 1px solid #ffcccc;">
        <td style="padding: 8px;">${item.utstyr_navn}</td>
        <td style="padding: 8px; font-family: monospace;">${sn}</td>
        <td style="padding: 8px;">${item.email}</td>
        <td style="padding: 8px; font-weight: bold; color: #d00;">
            ${demoDager} dager
        </td>
        <td style="padding: 8px;">
            <button onclick="sendPurreEpost('${item.email}', '${item.utstyr_navn}')" class="btn-status" style="background: #e74c3c;">
                📧 Send purring
            </button>
        </td>
    </tr>`;
    });

    html += "</table>";
    purreListe.innerHTML = html;
  } else {
    purreListe.innerHTML =
      "<p>Ingen utstyr er markert som utlånt i systemet.</p>";
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

    const knapp = document.getElementById("admin-toggle-purring");
    const purreSeksjon = document.getElementById("purre-seksjon");
    const loggPanel = document.getElementById("logg-panel");
    const adminPanel = document.querySelector(".admin-panel");

    // Hvis ingen er logget inn, skjul alt og avslutt
    if (!user) {
      if (adminPanel) adminPanel.style.display = "none";
      if (loggPanel) loggPanel.style.display = "none";
      if (purreSeksjon) purreSeksjon.style.display = "none";
      if (knapp) knapp.style.display = "none";
      return;
    }

    // 2. Sjekk om brukeren er admin i databasen
    const { data: profil } = await _supabase
      .from("profiler")
      .select("er_admin")
      .eq("id", user.id)
      .single();

    if (profil && profil.er_admin === true) {
      console.log("Status: ADMIN bekreftet");
      // Inne i sjekkAdminStatus, under logikken for "knapp" (purre-toggle)
      const tidKnapp = document.getElementById("toggle-tid-knapp");
      if (adminPanel) adminPanel.style.display = "block";
      if (tidKnapp) {
        tidKnapp.style.display = "block";
        tidKnapp.onclick = () => {
          visUtlaanstidAdmin = !visUtlaanstidAdmin; // Snu status
          tidKnapp.innerText = visUtlaanstidAdmin
            ? "⌛ Skjul tid"
            : "⌛ Vis utlånstid";
          hentUtstyr(); // Oppdater tabellen med den nye kilden
        };
      }

      // Vis logg og knapp for admin
      if (loggPanel) loggPanel.style.display = "block";
      if (knapp) {
        knapp.style.display = "block";
        // Legg til klikk-funksjonen her
        knapp.onclick = () => {
          if (purreSeksjon.style.display === "none") {
            purreSeksjon.style.display = "block";
            knapp.innerText = "🔔 Skjul Purringer";
            knapp.style.background = "#333";
          } else {
            purreSeksjon.style.display = "none";
            knapp.innerText = "🔔 Vis Purringer";
            knapp.style.background = "#ff4444";
          }
        };
      }

      // Hent data i bakgrunnen
      hentLogg();
      oppdaterPurreVisning();

      // Start med purre-seksjonen skjult selv om man er admin
      if (purreSeksjon) purreSeksjon.style.display = "none";

      document.getElementById("user-display").innerText =
        "Logget inn som: Admin";
    } else {
      console.log("Status: Standard bruker");

      // Skjul admin-verktøy for vanlige brukere
      if (loggPanel) loggPanel.style.display = "none";
      if (purreSeksjon) purreSeksjon.style.display = "none";
      if (knapp) knapp.style.display = "none";
      if (adminPanel) adminPanel.style.display = "none";

      document.getElementById("user-display").innerText =
        "Logget inn som: Bruker";
    }
  }
};
