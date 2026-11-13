import { termsArticles } from "./terms.js?v=8";
import { offers, residences, bookingEmail, availabilityUrl } from "./config.js?v=7";
import { descriptions } from "./descriptions.js?v=4";

const translations = {
  hero: ["Votre séjour Plagne Villages", "Your stay in Plagne Villages"],
  intro: ["Deux résidences. Studios, appartement familial et chambres en colocation.", "Two residences. Studios, a family apartment and rooms in shared accommodation."],
  village1: ["À Plagne Villages, on profite du calme d’un village de montagne et des services du front de neige. Sur place, vous trouverez une supérette pour vos courses, des magasins de sport pour louer ou faire régler votre matériel et des restaurants pour déjeuner entre deux descentes ou dîner après le ski.","Plagne Villages combines a quiet mountain setting with the convenience of a ski village. Pick up groceries at the local supermarket, hire or adjust your equipment at a sports shop, and choose from restaurants for lunch between runs or dinner after skiing."],
  village2: ["Les cours de ski se réservent auprès de l’ESF. La caisse des forfaits de ski se trouve en bas du front de neige, face à l’école de ski. Vous pouvez ainsi préparer votre journée sur place avant de chausser les skis.","Book ski lessons with the ESF. The lift pass office is at the foot of the snowfront, opposite the ski school, so you can get everything sorted before heading out."],
  village3: ["À environ 500 mètres, Plagne Soleil se rejoint par la navette gratuite en saison. Vous y trouverez d’autres commerces, des restaurants et un spa. Pour une ambiance plus animée, le Télébus rejoint Plagne Centre en environ deux minutes.","Plagne Soleil is about 500 metres away and can be reached by free shuttle in season. It has more shops, restaurants and a spa. For a livelier atmosphere, the Télébus takes you to Plagne Centre in about two minutes."],
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
      const title = el("h3", null, "card-title");
      title.append(el("span", residence.id === "aspen" ? "ASPEN" : "HAMEAUX 1"), el("span", item.cardLabel[lang]));
      card.append(photo(item.cover, item), title, el("p", capacityLabel(item), "muted"), link(tr("Fiche et calendrier", "Details and calendar"), "#" + item.id));
      cards.append(card);
    }
    section.append(el("h3", residence.name), el("p", residence.intro[lang], "residence-intro"), cards, residenceMap(residence));
    byId("offers").append(section);
  }
}
function residenceMap(residence) {
  const section = el("section", null, "residence-map");
  const map = el("iframe");
  map.src = residence.mapEmbed;
  map.title = residence.name + " · Google Maps";
  map.loading = "lazy";
  map.referrerPolicy = "no-referrer";
  const directions = el("a", tr("Ouvrir dans Google Maps", "Open in Google Maps"));
  directions.href = residence.mapsLink;
  directions.target = "_blank";
  directions.rel = "noopener noreferrer";
  section.append(map, directions);
  return section;
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
  calendar(calendarPanel);
  layout.append(calendarPanel);
  const gallery = el("div", null, "gallery");
  gallery.append(...offer.photos.map((url, index) => {
    const imageLink = el("a");
    imageLink.href = url.replace("im_w=720", "im_w=1200");
    imageLink.target = "_blank";
    imageLink.rel = "noopener noreferrer";
    const image = photo(url, offer);
    image.alt += " · " + tr("Photo", "Photo") + " " + (index + 1);
    imageLink.append(image);
    return imageLink;
  }));
  const contactLink = link(tr("Contacter l’hôte", "Contact the host"), "#contact");
  contactLink.addEventListener("click", () => { byId("contact-listing").value = selected.id; });
  const actions = el("div", null, "listing-actions");
  actions.append(contactLink, link(tr("Consulter cette annonce sur Airbnb", "View this listing on Airbnb"), listingUrl(offer)));
  const description = el("section", null, "listing-description");
  description.append(el("h3", tr("À propos de ce logement", "About this place")));
  const headings = new Set(["Le logement", "Accès des voyageurs", "Pendant votre séjour", "Autres remarques", "LINGE DE MAISON", "FOND DE TIROIR", "MÉNAGE", "The space", "Guest access", "During your stay", "Other things to note", "LINEN", "KITCHEN BASICS", "CLEANING"]);
  for (const paragraph of descriptions[offer.id][lang].split("\n\n")) {
    const [first, ...remaining] = paragraph.split("\n");
    if (headings.has(first)) {
      description.append(el("h4", first));
      if (remaining.length) description.append(el("p", remaining.join("\n")));
    } else {
      description.append(el("p", paragraph));
    }
  }
  const termsNote = el("p", null, "muted");
  const termsLink = el("a", tr("Conditions des réservations directes, dont le linge et le ménage", "Direct booking terms, including linen and cleaning"));
  termsLink.href = "#terms";
  termsNote.append(termsLink);
  description.append(termsNote);
  container.replaceChildren(link(tr("Retour aux résidences", "Back to residences"), "#residences"), el("h2", offer.name[lang]),
    el("p", capacityLabel(offer), "muted"), gallery, description, layout, actions);
  if (focus) { container.focus({ preventScroll: true }); container.scrollIntoView(); }
}
function legal() {
  const draft = tr("Projet à valider avant publication", "Draft for approval before publication");
  const sections = termsArticles.map(([title, points], index) => {
    const section = el("section", null, "terms-article");
    const list = el("ul");
    for (const point of points) list.append(el("li", point[lang]));
    section.append(el("h3", "Article " + (index + 1) + " — " + title[lang]), list);
    return section;
  });
  byId("terms").replaceChildren(el("h2", translations.terms[lang]), el("p", draft, "muted"), ...sections);
  byId("legal").replaceChildren(el("h2", translations.legal[lang]), el("p", draft, "muted"),
    el("p", tr("Éditeur : La Plagne Stay · [Nom légal de l’exploitant, statut, adresse postale et coordonnées]. Directeur de la publication : [nom]. Immatriculation et enregistrement du meublé : [références applicables].", "Publisher: La Plagne Stay · [Operator’s legal name, status, postal address and contact details]. Publication director: [name]. Business and rental registration: [applicable references].")),
    el("p", tr("Hébergeur : OVHcloud · OVH SAS, 2 rue Kellermann, 59100 Roubaix, France · coordonnées à confirmer.", "Hosting provider: OVHcloud · OVH SAS, 2 rue Kellermann, 59100 Roubaix, France · contact details to be confirmed.")),
    el("p", tr("Réclamations et médiation : [coordonnées et modalités à compléter selon le statut de l’exploitant].", "Complaints and mediation: [contact details and procedure to be completed according to the operator’s status].")));
}
function contact() {
  const section = byId("contact");
  const previous = Object.fromEntries(Array.from(section.querySelectorAll("[name]"), field => [field.name, field.value]));
  const emailLink = el("a", bookingEmail);
  emailLink.href = "mailto:" + bookingEmail;
  const address = el("p");
  address.append(emailLink);
  const form = el("form", null, "contact-form");
  function field(name, label, control) {
    control.name = name;
    const wrapper = el("label", label);
    wrapper.append(control);
    form.append(wrapper);
    control.value = previous[name] ?? "";
    return control;
  }
  const nameInput = el("input");
  nameInput.autocomplete = "name";
  nameInput.maxLength = 100;
  nameInput.required = true;
  const name = field("name", tr("Votre nom", "Your name"), nameInput);
  const emailInput = el("input");
  emailInput.type = "email";
  emailInput.autocomplete = "email";
  emailInput.maxLength = 254;
  emailInput.required = true;
  const email = field("email", tr("Votre e-mail", "Your email"), emailInput);
  const select = el("select");
  select.id = "contact-listing";
  select.append(new Option(tr("Question générale", "General enquiry"), ""), ...offers.map(item => new Option(item.name[lang], item.id)));
  const listing = field("listing", tr("Logement", "Accommodation"), select);
  const textarea = el("textarea");
  textarea.rows = 6;
  textarea.maxLength = 1000;
  textarea.required = true;
  const message = field("message", tr("Votre message", "Your message"), textarea);
  const send = el("button", tr("Ouvrir ma messagerie", "Open my email app"));
  send.type = "submit";
  const hint = el("p", tr("Le formulaire prépare un e-mail que vous envoyez depuis votre messagerie.", "The form prepares an email for you to send from your email app."), "muted");
  form.append(send, hint);
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const item = offers.find(offer => offer.id === listing.value);
    const subject = "La Plagne Stay · " + (item?.name[lang] ?? tr("Contact", "Enquiry"));
    const body = [tr("Nom", "Name") + " : " + name.value.trim(), tr("E-mail", "Email") + " : " + email.value.trim(), "", message.value.trim()].join("\r\n");
    location.href = "mailto:" + bookingEmail + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  });
  section.replaceChildren(el("h2", translations.contact[lang]), address, form);
}
function route(focus = false) {
  const page = ["contact", "terms", "legal"].find(id => "#" + id === location.hash);
  document.querySelector(".hero").hidden = Boolean(page);
  document.querySelector(".village-intro").hidden = Boolean(page);
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
