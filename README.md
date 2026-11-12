# La Plagne Stay

Site statique de réservation sur demande, en français et en anglais. Les cinq offres figurent dans `site/config.js`. Le fichier `data/availability.json` est le seul résultat public de la synchronisation.

## Prévisualiser et tester

Avec Node.js 22 ou plus récent, lancer `node --test` depuis le dépôt. Pour une prévisualisation locale, servir le dossier `site/` par HTTP, par exemple avec `python -m http.server 8080 --directory site`, puis ouvrir http://localhost:8080. L’aperçu utilise les données publiques de la branche main, si une synchronisation a déjà réussi.

## Configurer les flux Airbnb

Dans **Settings → Secrets and variables → Actions → New repository secret**, coller directement les cinq URL d’export Airbnb, chacune dans le secret correspondant.

| Offre | Secret |
|---|---|
| studio-plagnevillages | ICAL_HAMEAUX |
| studio-aspen | ICAL_ASPEN_STUDIO |
| appart-aspen | ICAL_ASPEN_ENTIER |
| coloc1-aspen | ICAL_ASPEN_COLOC1 |
| coloc2-aspen | ICAL_ASPEN_COLOC2 |

Éviter de coller les URL dans le chat, une issue, un commit ou une variable publique. Lancer **Actions → Synchronisation des disponibilités → Run workflow**, sur `main`, après la saisie des cinq secrets. Vérifier que l’exécution aboutit, que le JSON ne contient que des identifiants d’offres, des intervalles de dates fusionnés et la date de mise à jour, puis comparer des nuits connues sur les cinq annonces. Les exécutions suivantes sont prévues toutes les trois heures. GitHub peut retarder les exécutions ou désactiver les planifications après 60 jours d’inactivité sur le dépôt public.

Les cinq flux sont lus via HTTPS sans redirection. Les contenus iCal restent en mémoire et seuls les événements à la journée sont pris en charge. Le départ est exclusif. En cas de flux absent, inaccessible ou au format inattendu, le dernier fichier public est conservé. L’interface affiche des dates inconnues après huit heures sans actualisation. Les nuits futures sans blocage détecté restent à vérifier, y compris les contraintes de durée et d’arrivée. La vue couvre 365 nuits à partir de la date de synchronisation à Paris.

Chaque offre Aspen reprend uniquement son propre flux Airbnb. La liaison des calendriers et les éventuels blocages croisés sont gérés dans Airbnb. Lors d’une réservation directe, reporter le blocage manuellement et contrôler les annonces liées dans Airbnb. Le format version 2 empêche de réafficher d’anciens blocages fusionnés.

## Préparer la mise en ligne

1. Vérifier les photos et descriptions issues des annonces, renseigner les tarifs et taxes et vérifier l’adresse de contact dédiée. Compléter et valider les CGV et les mentions légales, ainsi que l’information sur les données au point de contact, dans les deux langues. Confirmer la base exacte de la comparaison à −10 % avant publication. Vérifier l’acompte et les règles d’annulation, les délais de paiement, les cautions et les frais annexes. Remplacer les textes provisoires avant l’ouverture publique. Vérifier chaque demande de bout en bout avec l’adresse de contact. Le formulaire Contact est commun à toutes les offres. L’e-mail s’ouvre dans la messagerie du visiteur, qui procède lui-même à l’envoi.
2. Après autorisation, confirmer la disponibilité et l’accès à `laplagnestay.fr` dans l’espace OVHcloud. GitHub Pages exclut l’hébergement de sites principalement destinés à faciliter des transactions commerciales. Le code et le JSON restent sur GitHub. Pour le site public, vérifier l’éligibilité au mini-hébergement 100 Mo inclus avec le domaine, avec transfert chiffré et SSL, ou utiliser une offre OVHcloud adaptée. Le prix publié du renouvellement du .fr est de 9,35 € TTC/an au 12 novembre 2026. Le prix publié de renouvellement Starter est de 2,59 € HT/mois, soit environ 46,65 € TTC/an domaine compris, à confirmer au panier.
3. Dans l’hébergement OVHcloud, associer `laplagnestay.fr` et éventuellement `www.laplagnestay.fr` au dossier web. Relever les cibles du service attribué. Configurer les enregistrements A et, si le service le fournit, AAAA sur le domaine racine. Pour `www`, utiliser les cibles A/AAAA ou le CNAME indiqué par OVHcloud. Conserver les enregistrements de messagerie et vérifier les anciens A/AAAA incompatibles avant de les remplacer. Les valeurs définitives dépendent de l’hébergement attribué. Aucune IP GitHub Pages n’est requise.
4. Activer le certificat SSL pour les noms retenus après propagation DNS. Vérifier le certificat et les redirections vers HTTPS et vers le nom canonique via la configuration d’hébergement. Publier uniquement le contenu de `site/` via un transfert chiffré pris en charge par l’offre. Vérifier que le JavaScript et le JSON se chargent sur les deux langues. Retirer les directives de non-indexation après validation de la mise en ligne.
5. Pour chaque demande, vérifier toutes les annonces Airbnb concernées et les éventuelles demandes directes en cours. Bloquer manuellement les nuits sur Airbnb sur l’offre concernée et vérifier les blocages des offres Aspen liées avant confirmation définitive. Relancer une synchronisation si nécessaire et contrôler l’affichage. Le site n’écrit jamais dans Airbnb.

### Sources

- [Règles GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Planification GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [Calendriers Airbnb](https://www.airbnb.fr/help/article/99) et [liaison des annonces](https://www.airbnb.fr/help/article/1864)
- [OVHcloud .fr](https://www.ovhcloud.com/fr/domains/tld/fr/), [hébergement inclus](https://www.ovhcloud.com/fr/domains/free-web-hosting/) et [Starter](https://www.ovhcloud.com/fr/web-hosting/cheap-web-hosting/)
- [Location de vacances, Service Public](https://www.service-public.fr/particuliers/vosdroits/F2045)

### Carte Aspen

Le lien et la carte intégrée Aspen pointent vers la fiche Google La Plagne Stay. Les deux URL figurent dans `site/config.js`.