import { offers, residences, bookingEmail, legalApproved, availabilityUrl } from "./config.js";

const translations = {
  hero: ["Votre séjour à La Plagne", "Your stay in La Plagne"],
  intro: ["Deux résidences. Studios, appartement entier et chambres en colocation.", "Two residences. Studios, an entire apartment and rooms in shared accommodation."],
  browse: ["Voir les logements", "Browse accommodation"], residences: ["Résidences", "Residences"],
  guests: ["Voyageurs", "Guests"], legal: ["CGV, mentions légales et confidentialité", "Terms, legal notice and privacy"]
};
let lang = new URLSearchParams(location.search).get("lang") === "en" ? 1 : 0;
let data = null;
let offer = null;
let month = null;
const byId = (id) => document.getElementById(id);
const tr = (fr, en) => [fr, en][lang];
const locale = () => tr("fr-FR", "en-GB");
const iso = (date) => date.toISOString().slice(0, 10);
const parisDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
function localDate() {
  const { year, month, day } = Object.fromEntries(parisDate.formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return [year, month, day].join("-");
}
function el(tag, value, cls) {
  const node = document.createElement(tag);
  if (value) node.textContent = value;
  if (cls) node.className = cls;
  return node;
}
function button(label, action) {
  const node = el("button", label);
  node.type = "button";
  node.addEventListener("click", action);
  return node;
}
function link(label, hash) {
  const node = el("a", label, "primary");
  node.href = hash;
  return node;
}
function listOffers() {
  const input = byId("guests");
  const count = input.valueAsNumber;
  const visible = offers.filter(item => !count || (item.capacity !== null && item.capacity >= count));
  byId("filter-status").textContent = !input.validity.valid
    ? tr("Saisissez un nombre entier de 1 à 99.", "Enter a whole number from 1 to 99.")
    : !count ? "" : visible.length === 0
    ? tr("Aucune capacité publiée ne correspond. Effacez le filtre pour voir toutes les offres.", "No published capacity matches. Clear the filter to see all listings.")
    : offers.some(item => item.capacity === null)
    ? tr("Les offres dont la capacité reste à renseigner sont masquées.", "Listings with unpublished capacity are hidden.") : "";
  byId("offers").replaceChildren();
  if (!input.validity.valid) return;
  for (const residence of residences) {
    const items = visible.filter(item => item.residence === residence.id);
    if (!items.length) continue;
    const section = el("section", null, "residence");
    const cards = el("div", null, "cards");
    for (const item of items) {
      const card = el("article", null, "card");
      const capacity = item.capacity === null ? tr("Capacité à renseigner", "Capacity to be added") : item.capacity + " " + tr("voyageur(s)", "guest(s)");
      card.append(el("div", tr("Photo à ajouter", "Photo to be added"), "photo"), el("h3", item.name[lang]), el("p", capacity, "muted"), link(tr("Fiche et calendrier", "Details and calendar"), "#" + item.id));
      cards.append(card);
    }
    section.append(el("h3", residence.name), cards);
    byId("offers").append(section);
  }
}
function conditions(item) {
  return [
    tr("Acompte envisagé de 50 % non remboursable. Solde un mois avant l’arrivée. Réservation tardive à régler intégralement. Modalités soumises à validation juridique.", "Proposed 50% non-refundable deposit. Balance due one month before arrival. Late bookings payable in full. Subject to legal review."),
    tr("Caution à valider 24 h avant l’arrivée : chèque de 500 € avec attestation RC villégiature, ou Swikly " + item.swikly + " €.", "Security deposit to be validated 24 hours before arrival: €500 cheque with holiday rental liability insurance certificate, or Swikly €" + item.swikly + "."),
    item.cleaning === null
      ? tr("Restitution en bon état de propreté. Linge inclus.", "Leave the room and shared areas clean. Linen included.")
      : tr("Ménage par le locataire ou option à " + item.cleaning + " €. Linge en option à 20 € par personne, à demander 48 h avant l’arrivée.", "Guest cleaning or an optional €" + item.cleaning + " cleaning service. Linen optional at €20 per person, request 48 hours before arrival.")
  ];
}
function status(day) {
  const stamp = Date.parse(data?.updatedAt);
  const ranges = data?.offers?.[offer.id];
  if (!Number.isFinite(stamp) || Date.now() - stamp > 8 * 3600000 || stamp > Date.now() + 600000 ||
      !Array.isArray(ranges) || day < localDate() || day < data.from || day >= data.until) return "unknown";
  return ranges.some(([start, end]) => day >= start && day < end) ? "blocked" : "clear";
}
function calendar(panel) {
  const date = new Date(month);
  const floor = localDate().slice(0, 7);
  const ceiling = new Date(floor + "-01T00:00:00Z");
  ceiling.setUTCMonth(ceiling.getUTCMonth() + 12);
  const shift = (delta) => {
    date.setUTCMonth(date.getUTCMonth() + delta);
    month = date.getTime();
    calendar(panel);
    panel.querySelector(delta < 0 ? "#prev" : "#next").focus();
    if (document.activeElement === document.body) panel.querySelector("caption").focus();
  };
  const prev = button(tr("Précédent", "Previous"), () => shift(-1));
  prev.id = "prev"; prev.disabled = iso(date).slice(0, 7) <= floor;
  const next = button(tr("Suivant", "Next"), () => shift(1));
  next.id = "next"; next.disabled = month >= ceiling.getTime();
  const controls = el("div", null, "calendar-controls");
  controls.append(prev, next);
  const table = el("table", null, "calendar");
  const title = el("caption", new Intl.DateTimeFormat(locale(), { month: "long", year: "numeric", timeZone: "UTC" }).format(date));
  title.tabIndex = -1;
  table.append(title);
  const header = table.createTHead().insertRow();
  const dayFormat = new Intl.DateTimeFormat(locale(), { weekday: "short", timeZone: "UTC" });
  for (let i = 0; i < 7; i++) {
    const cell = el("th", dayFormat.format(new Date(Date.UTC(2024, 0, 1 + i))));
    cell.scope = "col";
    header.append(cell);
  }
  const body = table.createTBody();
  const offset = (date.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  const labels = { clear: tr("Aucun blocage signalé", "No block reported"), blocked: tr("Bloquée", "Blocked"), unknown: tr("Inconnue", "Unknown") };
  for (let i = 0; i < offset + days; i += 7) {
    const row = body.insertRow();
    for (let j = 0; j < 7; j++) {
      const cell = row.insertCell();
      const day = i + j - offset + 1;
      if (day < 1 || day > days) continue;
      const key = iso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), day)));
      const state = status(key);
      cell.dataset.state = state;
      cell.textContent = day + " " + { clear: "○", blocked: "×", unknown: "·" }[state];
      cell.title = labels[state];
      cell.setAttribute("aria-label", day + " — " + labels[state]);
    }
  }
  const stamp = Date.parse(data?.updatedAt);
  const last = Number.isFinite(stamp)
    ? new Intl.DateTimeFormat(locale(), { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" }).format(stamp) + " (Paris)"
    : tr("En attente de synchronisation", "Awaiting sync");
  panel.replaceChildren(el("h3", tr("Disponibilités", "Availability")), controls, table,
    el("p", "○ " + labels.clear + " · × " + labels.blocked + " · · " + labels.unknown, "muted"),
    el("p", tr("Dernière mise à jour : ", "Last updated: ") + last, "muted"),
    el("p", tr("Les nuits sans blocage signalé restent à confirmer. Données masquées après 8 h sans mise à jour.", "Nights with no reported block still require confirmation. Data is hidden after 8 hours without a refresh."), "muted"));
}
function request(panel) {
  const enabled = legalApproved && /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(bookingEmail) && Number.isInteger(offer.capacity) && offer.capacity > 0;
  panel.append(el("h3", tr("Demande de réservation", "Booking enquiry")),
    el("p", tr("L’hôte vérifie les dates et répond par e-mail. Aucun paiement ni confirmation automatique.", "The host checks the dates and replies by email. No payment or automatic confirmation.")));
  const form = el("form");
  function field(type, label) {
    const wrapper = el("label", label);
    const input = el("input");
    input.type = type;
    input.required = true;
    input.disabled = !enabled;
    wrapper.append(input);
    form.append(wrapper);
    return input;
  }
  const start = field("date", tr("Arrivée", "Check-in"));
  const end = field("date", tr("Départ", "Check-out"));
  start.min = localDate(); end.min = localDate();
  const guests = field("number", tr("Voyageurs", "Guests"));
  guests.min = 1; guests.max = offer.capacity || 99; guests.step = 1;
  const send = el("button", tr("Préparer l’e-mail", "Prepare email"));
  send.type = "submit"; send.disabled = !enabled;
  const feedback = el("p", enabled ? tr("Le bouton ouvre votre messagerie. Vous envoyez la demande depuis celle-ci.", "The button opens your email app. Send your enquiry from there.") : tr("Demandes en attente d’activation.", "Enquiries awaiting activation."), "muted");
  feedback.setAttribute("role", "status");
  form.append(send, feedback);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!enabled || !form.reportValidity()) return;
    if (start.value < localDate() || end.value <= start.value) {
      feedback.textContent = tr("Vérifiez les dates. Le départ doit suivre l’arrivée.", "Check the dates. Check-out must follow check-in.");
      return;
    }
    const arrival = Date.parse(start.value);
    const departure = Date.parse(end.value);
    if (!Number.isFinite(arrival) || !Number.isFinite(departure) || departure - arrival > 365 * 86400000) {
      feedback.textContent = tr("Sélectionnez un séjour de 365 nuits maximum.", "Select a stay of up to 365 nights.");
      return;
    }
    for (let day = arrival; day < departure; day += 86400000) {
      if (status(iso(new Date(day))) === "blocked") {
        feedback.textContent = tr("Le séjour inclut une nuit bloquée. Modifiez les dates.", "Your stay includes a blocked night. Change your dates.");
        return;
      }
    }
    const title = tr("Demande La Plagne Stay", "La Plagne Stay enquiry") + " · " + offer.name[lang];
    const body = [offer.name[lang], tr("Arrivée", "Check-in") + " : " + start.value, tr("Départ", "Check-out") + " : " + end.value, tr("Voyageurs", "Guests") + " : " + guests.value].join("\r\n");
    location.href = "mailto:" + bookingEmail + "?subject=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(body);
  });
  panel.append(form);
}
function detail(focus = false) {
  const selected = offers.find(item => "#" + item.id === location.hash);
  if (selected !== offer) month = null;
  offer = selected;
  const container = byId("detail");
  container.hidden = !offer;
  if (!offer) return;
  month ??= Date.parse(localDate().slice(0, 7) + "-01T00:00:00Z");
  const layout = el("div", null, "detail-layout");
  const calendarPanel = el("section", null, "panel");
  calendarPanel.id = "calendar-panel";
  const requestPanel = el("section", null, "panel");
  calendar(calendarPanel);
  request(requestPanel);
  layout.append(calendarPanel, requestPanel);
  const terms = el("details");
  terms.append(el("summary", tr("Conditions de séjour proposées", "Proposed stay conditions")), ...conditions(offer).map(line => el("p", line)));
  container.replaceChildren(link(tr("Retour aux résidences", "Back to residences"), "#residences"), el("h2", offer.name[lang]),
    el("p", tr("Description, photos et tarif à renseigner.", "Description, photos and rates to be added."), "muted"), layout, terms);
  if (focus) { container.focus({ preventScroll: true }); container.scrollIntoView(); }
}
function legal() {
  byId("legal").replaceChildren(el("h2", translations.legal[lang]), ...[
    [tr("CGV", "Terms"), tr("Projet à valider : prix et taxes, contrat, modalités de paiement, annulations, caution et litiges. Les conditions proposées figurent dans chaque fiche.", "Draft for review: pricing and taxes, contract, payment, cancellation, security deposit and disputes. Proposed conditions appear in each listing.")],
    [tr("Mentions légales", "Legal notice"), tr("À compléter : identité et coordonnées de l’éditeur, statut et identifiants applicables, directeur de publication et coordonnées de l’hébergeur.", "To complete: publisher identity and contact details, applicable registration information, publication director and hosting provider details.")],
    [tr("Confidentialité", "Privacy"), tr("Projet à valider : le formulaire prépare un e-mail sur votre appareil. Le calendrier est chargé depuis GitHub. À compléter : responsable, finalités, bases légales, destinataires, durées et droits.", "Draft for review: the form prepares an email on your device. The calendar is loaded from GitHub. To complete: controller, purposes, legal bases, recipients, retention and rights.")]
  ].map(([label, description]) => {
    const box = el("details");
    box.append(el("summary", label), el("p", description));
    return box;
  }));
}
function render() {
  document.documentElement.lang = tr("fr", "en");
  byId("language").lang = tr("en", "fr");
  byId("language").textContent = tr("English", "Français");
  for (const node of document.querySelectorAll("[data-t]")) node.textContent = translations[node.dataset.t][lang];
  listOffers(); detail(); legal();
}
async function refresh() {
  try {
    const response = await fetch(availabilityUrl, { cache: "no-store", credentials: "omit" });
    if (!response.ok) throw new Error();
    const payload = await response.json();
    const isDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (!payload || !isDate(payload.from) || !isDate(payload.until) || payload.until <= payload.from ||
        !offers.every(({ id }) => Array.isArray(payload.offers?.[id]) && payload.offers[id].every(
          range => Array.isArray(range) && range.length === 2 && range.every(isDate) && range[0] < range[1]
        ))) throw new Error();
    data = payload;
  } catch {
    data = null;
  }
  const panel = byId("calendar-panel");
  if (panel && offer) calendar(panel);
}
byId("language").addEventListener("click", () => {
  lang = 1 - lang;
  const url = new URL(location.href);
  url.searchParams.set("lang", tr("fr", "en"));
  history.replaceState(null, "", url);
  render();
});
byId("guests").addEventListener("input", listOffers);
window.addEventListener("hashchange", () => detail(true));
render();
if (offer) detail(true);
void refresh();
setInterval(refresh, 5 * 60000);
