export const bookingEmail = "";
export const legalApproved = false;
export const availabilityUrl = "https://raw.githubusercontent.com/VESTAKARE/laplagnestay/main/data/availability.json";

export const residences = [
  { id: "hameaux", name: "Les Hameaux de Plagne Villages" },
  { id: "aspen", name: "Aspen" }
];

export const offers = [
  { id: "studio-plagnevillages", residence: "hameaux", name: ["Studio Plagne Villages", "Plagne Villages studio"], capacity: null, swikly: 500, cleaning: 80 },
  { id: "studio-aspen", residence: "aspen", name: ["Studio Aspen", "Aspen studio"], capacity: null, swikly: 1000, cleaning: 80 },
  { id: "appart-aspen", residence: "aspen", name: ["Appartement Aspen entier", "Entire Aspen apartment"], capacity: null, swikly: 1000, cleaning: 200 },
  { id: "coloc1-aspen", residence: "aspen", name: ["Aspen · Chambre 1", "Aspen · Room 1"], capacity: null, swikly: 500, cleaning: null },
  { id: "coloc2-aspen", residence: "aspen", name: ["Aspen · Chambre 2", "Aspen · Room 2"], capacity: null, swikly: 500, cleaning: null }
];
