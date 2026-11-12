import { offers, residences, bookingEmail, legalApproved, availabilityUrl } from "./config.js?v=2";

const translations = {
  hero: ["Votre séjour à La Plagne", "Your stay in La Plagne"],
  intro: ["Deux résidences. Studios, appartement entier et chambres en colocation.", "Two residences. Studios, an entire apartment and rooms in shared accommodation."],
  browse: ["Voir les logements", "Browse accommodation"], residences: ["Résidences", "Residences"],
  guests: ["Voyageurs", "Guests"], legal: ["Mentions légales", "Legal notice"],
  terms: ["CGV", "Terms"], contact: ["Contact", "Contact"],
  saving: ["−10 % par rapport au tarif Airbnb", "10% below the Airbnb price"],
  comparison: ["En direct, pour le même logement, les mêmes dates et le même nombre de voyageurs. Tarif confirmé dans le devis.", "Book direct for the same accommodation, dates and number of guests. Price confirmed in your quote."]
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
function photo(url, item) {
  const image = el("img", null, "photo");
  image.src = url;
  image.alt = item.name[lang];
  image.loading = "lazy";
  image.referrerPolicy = "no-referrer";
  return image;
}
const listingUrl = (item) => "https://www.airbnb.fr/rooms/" + item.airbnbId;
const capacityLabel = (item) => item.capacity + " " + tr("voyageurs", "guests");

function listOffers() {
  const input = byId("guests");
  const choice = input.value;
  const maximum = Math.max(...offers.map(item => item.capacity));
  input.replaceChildren(new Option(tr("Tous", "Any"), ""), ...Array.from({ length: maximum }, (_, index) => new Option(String(index + 1), String(index + 1))));
  input.value = choice;
  const visible = offers.filter(item => item.capacity >= Number(choice));
  byId("filter-status").textContent = choice ? visible.length + " " + (visible.length === 1 ? tr("offre", "listing") : tr("offres", "listings")) : "";
  byId("offers").replaceChildren();
  for (const residence of residences) {
    const items = visible.filter(item => item.residence === residence.id);
    if (!items.length) continue;
    const section = el("section", null, "residence");
    const cards = el("div", null, "cards");
    for (const item of items) {
      const card = el("article", null, "card");
      card.append(photo(item.photos[0], item), el("h3", item.name[lang]), el("p", capacityLabel(item), "muted"), link(tr("Fiche et calendrier", "Details and calendar"), "#" + item.id));
      cards.append(card);
    }
    section.append(el("h3", residence.name), cards);
    byId("offers").append(section);
  }
}
const emailConfigured = /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(bookingEmail);

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
  const enabled = legalApproved && emailConfigured;
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
  const gallery = el("div", null, "gallery");
  gallery.append(...offer.photos.map(url => photo(url, offer)));
  container.replaceChildren(link(tr("Retour aux résidences", "Back to residences"), "#residences"), el("h2", offer.name[lang]),
    el("p", capacityLabel(offer), "muted"), gallery, el("p", offer.description[lang]), layout,
    link(tr("Consulter cette annonce sur Airbnb", "View this listing on Airbnb"), listingUrl(offer)));
  if (focus) { container.focus({ preventScroll: true }); container.scrollIntoView(); }
}
function legal() {
  const draft = tr("Projet à valider avant publication", "Draft for approval before publication");
  const paragraphs = [
    tr("La demande est examinée par l’hôte. Le devis précise le logement, les dates, le prix total, les taxes, les options et les modalités d’annulation. La réservation est confirmée par écrit après acceptation des conditions convenues.", "The host reviews the enquiry. The quote specifies the listing, dates, total price, taxes, options and cancellation terms. The booking is confirmed in writing once the agreed terms have been accepted."),
    tr("Acompte envisagé de 50 % non remboursable, sous réserve de validation juridique et des exceptions applicables. Le solde est dû un mois avant l’arrivée. Pour une réservation dans ce délai, le règlement est intégral.", "Proposed 50% non-refundable booking deposit, subject to legal review and applicable exceptions. The balance is due one month before arrival. Bookings made within that period are payable in full."),
    tr("Caution à valider 24 h avant l’arrivée : chèque de 500 € et attestation de responsabilité civile villégiature, ou garantie Swikly de 500 € aux Hameaux et pour les deux chambres Aspen, et de 1 000 € pour le studio Aspen et Aspen 3 chambres.", "Validate the security deposit 24 hours before arrival: a €500 cheque with holiday rental liability insurance, or a Swikly guarantee of €500 for Les Hameaux and the two Aspen rooms, and €1,000 for the Aspen studio and Aspen 3-bedroom apartment."),
    tr("Ménage par le locataire ou option de 80 € pour les studios et 200 € pour Aspen 3 chambres. En colocation, restituer les espaces utilisés en bon état de propreté.", "Guests clean the accommodation or can choose an €80 cleaning option for either studio and €200 for Aspen 3-bedroom. Guests in shared accommodation must leave the areas they use clean."),
    tr("Linge inclus pour les deux chambres en colocation. Pour les studios et Aspen 3 chambres, option de 20 € par personne à demander au moins 48 h avant l’arrivée.", "Linen is included for both rooms in shared accommodation. For the studios and Aspen 3-bedroom, optional linen costs €20 per person and must be requested at least 48 hours before arrival.")
  ];
  byId("terms").replaceChildren(el("h2", translations.terms[lang]), el("p", draft, "muted"),
    el("h3", tr("Conditions de séjour proposées", "Proposed stay conditions")), ...paragraphs.map(value => el("p", value)));
  byId("legal").replaceChildren(el("h2", translations.legal[lang]), el("p", draft, "muted"),
    el("p", tr("Éditeur : La Plagne Stay · [Nom légal de l’exploitant, statut, adresse postale et coordonnées]. Directeur de la publication : [nom]. Immatriculation et enregistrement du meublé : [références applicables].", "Publisher: La Plagne Stay · [Operator’s legal name, status, postal address and contact details]. Publication director: [name]. Business and rental registration: [applicable references].")),
    el("p", tr("Hébergeur : OVHcloud · OVH SAS, 2 rue Kellermann, 59100 Roubaix, France · coordonnées à confirmer.", "Hosting provider: OVHcloud · OVH SAS, 2 rue Kellermann, 59100 Roubaix, France · contact details to be confirmed.")),
    el("p", tr("Réclamations et médiation : [coordonnées et modalités à compléter selon le statut de l’exploitant].", "Complaints and mediation: [contact details and procedure to be completed according to the operator’s status].")));
}
function contact() {
  const section = byId("contact");
  section.replaceChildren(el("h2", translations.contact[lang]),
    el("p", tr("Une question sur un logement ou sur votre séjour à La Plagne ?", "Have a question about a listing or your stay in La Plagne?")));
  if (emailConfigured) {
    section.append(link(bookingEmail, "mailto:" + bookingEmail),
      el("p", tr("Votre adresse et votre message servent à traiter votre demande. Pour exercer vos droits, écrivez à la même adresse.", "Your email address and message are used to handle your enquiry. To exercise your rights, write to the same address."), "muted"));
  } else {
    section.append(el("p", tr("Contact direct en cours de configuration. Pour joindre l’hôte, ouvrez l’annonce correspondante.", "Direct contact is being set up. To reach the host, open the relevant listing."), "muted"));
    const links = el("ul");
    for (const item of offers) {
      const entry = el("li");
      const anchor = el("a", item.name[lang] + " · Airbnb");
      anchor.href = listingUrl(item);
      entry.append(anchor);
      links.append(entry);
    }
    section.append(links);
  }
}
function route(focus = false) {
  const page = ["contact", "terms", "legal"].find(id => "#" + id === location.hash);
  document.querySelector(".hero").hidden = Boolean(page);
  byId("residences").hidden = Boolean(page);
  for (const id of ["contact", "terms", "legal"]) byId(id).hidden = id !== page;
  detail(focus);
  if (page && focus) {
    byId(page).focus({ preventScroll: true });
    byId(page).scrollIntoView();
  }
}
function render() {
  document.documentElement.lang = tr("fr", "en");
  byId("language").lang = tr("en", "fr");
  byId("language").textContent = tr("English", "Français");
  for (const node of document.querySelectorAll("[data-t]")) node.textContent = translations[node.dataset.t][lang];
  listOffers(); legal(); contact(); route();
}
async function refresh() {
  try {
    const response = await fetch(availabilityUrl, { cache: "no-store", credentials: "omit" });
    if (!response.ok) throw new Error();
    const payload = await response.json();
    const isDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (payload?.version !== 2 || !isDate(payload.from) || !isDate(payload.until) || payload.until <= payload.from ||
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
byId("guests").addEventListener("change", listOffers);
window.addEventListener("hashchange", () => route(true));
render();
if (location.hash) route(true);
void refresh();
setInterval(refresh, 5 * 60000);