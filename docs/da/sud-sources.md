# Sud · Huitztlampa · sources et modeles

Base documentaire du chantier « identite du Sud » (page Projets, turquoise),
constituee le 04/09/2026. Meme rigueur que le Codex : chaque element visuel
doit pouvoir citer sa source. Rien d'inventé ; les licences artistiques sont
nommees comme telles.

## Le mythe : la naissance a Coatepec

- Coatlicue, la deesse-mere, decouvre une boule de plumes (colibri) et en
  tombe enceinte. Sa fille Coyolxauhqui (lune) et ses 400 fils, les Centzon
  Huitznahua (les etoiles du Sud), montent a Coatepec pour la tuer.
  Huitzilopochtli nait arme, tue sa soeur (la demembre) et presque tous ses
  freres avec « le feu d'un serpent », le xiuhcoatl, son arme.
- Lecture cosmique : le soleil qui triomphe chaque matin de la lune et des
  etoiles. Les corps precipites dans l'escalier du Templo Mayor rejouaient
  le mythe.
- Les guerriers morts au combat accompagnaient le soleil ; apres quatre
  ans ils revenaient sur terre en colibris et en papillons.
- Sources primaires citees par Mexicolore : Sahagun (Historia General),
  Codex de Florence, Codex Tudela, manuscrit Tovar.
- Mexicolore, God of the Month : Huitzilopochtli.
  https://www.mexicolore.co.uk/aztecs/gods/god-of-the-month-huitzilopochtli
- Britannica, Huitzilopochtli. https://www.britannica.com/topic/Huitzilopochtli
- Templo Mayor, la pierre de Coyolxauhqui.
  https://universes.art/en/art-destinations/mexico/tour/templo-mayor/12

## Le xiuhcoatl, serpent de feu (pas « un serpent »)

Anatomie attestee (British Museum via Smarthistory/LibreTexts ; Mexicolore) :
- tete de serpent au museau tres allonge qui se RECOURBE sur lui-meme,
  borde de symboles oculaires circulaires (les yeux des etoiles, « les yeux
  de la nuit ») ;
- corps segmente ;
- courtes pattes anterieures a griffes ;
- queue : bandes paralleles puis un trapeze et un motif rayonnant = le signe
  de l'annee (xihuitl), premier element du nom (xiuh = turquoise, feu, annee).
Role : arme de Huitzilopochtli a Coatepec ; forme-esprit de Xiuhtecuhtli
(feu) ; ornement dorsal des deux dieux ; les deux xiuhcoatl de l'anneau
exterieur de la Piedra del Sol portent le soleil du lever au coucher
(queues jointes en haut, gueules ouvertes en bas).
Objet de reference : British Museum, pierre, 1325-1521, ~75,5 cm, sans
doute Texcoco, collection William Bullock 1823.
- Mexicolore, Fire serpent.
  https://www.mexicolore.co.uk/aztecs/artefacts/spotlight/fire-serpent
- Smarthistory (British Museum), Xiuhcoatl. https://smarthistory.org/xiuhcoatl-fire-serpent/
  (miroir LibreTexts 3.14.18 consulte, la page Smarthistory renvoyant 403).
- Wikipedia, Xiuhcoatl. https://en.wikipedia.org/wiki/Xiuhc%C5%8D%C4%81tl

Garde-fou du Codex (28/08) : evoquer par la lumiere, l'air et le
mouvement, jamais copier l'iconographie sacree. Le xiuhcoatl du site est
une creature de feu et de turquoise a l'anatomie fidele, pas la copie d'un
glyphe ou d'une sculpture.

## Modeles 3D

### Colibri
- TELECHARGE : `public/models/hummingbird-poly.glb`, « Hummingbird » de
  Poly by Google, licence CC Attribution 3.0, 634 triangles, un seul mesh
  `Hummingbird_Mesh`, materiau `Hummingbird_Mat`, AUCUNE animation ni rig
  (ailes non separees). Source : https://poly.pizza/m/70NyKFt-vLF
  A crediter sur /credits a l'integration.
- CANDIDAT ANIME (compte Sketchfab requis, non telechargeable ici) :
  « LowPoly humming-bird animated » d'alexi.smnd, CC-BY 4.0, 2 000
  triangles, animation de vol.
  https://sketchfab.com/3d-models/lowpoly-humming-bird-animated-abc35c5c30fc44c282188c3065a6daf0

### Xiuhcoatl
- British Museum, scan « Stone figure of Xiuhcoatl (Fire Serpent) »,
  52 500 triangles, licence CC BY-NC-SA 4.0 : NON COMMERCIAL, donc
  INUTILISABLE sur un site professionnel. Reste une reference visuelle.
  https://sketchfab.com/3d-models/stone-figure-of-xiuhcoatl-fire-serpent-eb247f805b204de384fa75cdf9781ff8
- Les autres resultats « xiuhcoatl » sur Sketchfab sont le fusil FX-05 de
  l'armee mexicaine, hors sujet.
- Conclusion : aucun modele libre de la creature. Options : geometrie
  controlee low poly (le style du site) sur l'anatomie ci-dessus, ou
  evocation par le feu sur les deux serpents deja graves dans l'anneau de
  la Piedra.

### Epines (Huitztlampa, « lieu des epines »)
- Deja dans le projet : `public/models/agave.glb` (le maguey),
  `nopal-google.glb`, `nopal-quaternius.glb`.

## Colibris du Mexique central (livrees pour differencier les oiseaux)
A verifier espece par espece avant integration : colibri a gorge rubis,
colibri de Rivoli (couronne violette, gorge verte), colibri circe (bec
large, corps turquoise), colibri beryl, colibri a couronne violette.

## Xiuhcoatl : modeles payants recherches le 04/09 (Sylvain : « cherche s'il y a des modeles payants et a combien »)

Aucun modele d'un xiuhcoatl COMPLET (museau retrousse, pattes, crete, queue
en signe de l'annee) en vente sur les places de marche consultees. Ce qui
existe :

| Source | Objet | Prix | Verdict |
|---|---|---|---|
| Fab, N-Hance Studio, « Stylized Fantasy Magma Serpent » | creature serpent de magma stylisee, 18 animations, 3 peaux, PBR, fbx/gltf/glb/usdz | 20,62 a 41,25 EUR (licence perso a pro) | seule CREATURE rigged et animee proche du feu ; pas l'anatomie du xiuhcoatl (ailes-nageoires, tete de dragon) |
| Fab, Purescans, « Aztec Feathered Serpent Sculpture » | scan photogrammetrie d'une TETE de serpent de temple, fbx, textures 8k | 10,30 a 13,40 EUR | tete de pierre seule, immobile ; utilisable en element de decor, pas en creature |
| Fab, Zbrushing25, « Serpents head sculpture » | tete sculptee | 20,62 EUR | idem, tete seule |
| TurboSquid, « Aztec Serpent Head » | tete de serpent de temple (ma, max, obj, fbx) | 39 USD | tete seule |
| CGTrader, « Aztec God Quetzalcoatl » | dieu a forme humaine, low poly rigged | 45 USD | serpent a plumes, pas le serpent de feu, et humanoide |
| Etsy, « Xiuhcoatl, Aztec Fire Serpent » | fiche 3D print (STL probable), page inaccessible (403) | 20 USD | non verifiable ici ; usage commercial des STL Etsy rarement autorise |
| Cults3D, DoubleDSculpt, « Xiuhcoatl (Fire Serpent) » | STL pour impression : serpent + poignee (une ARME, pas la creature) | 1,50 EUR | licence Cults PU, usage commercial interdit |
| Sketchfab, British Museum, « Stone figure of Xiuhcoatl » | scan 52 500 tris | gratuit | CC BY-NC-SA : non commercial, inutilisable |
| Sketchfab, SBCVL_UCSF, « Monumental Xiuhcoatl Stone » (Templo Mayor) | scan 187 600 tris | gratuit | CC BY-NC : non commercial, inutilisable ; excellente reference visuelle |
| Divers « FX-05 Xiuhcoatl » | le fusil d'assaut mexicain | 39 USD | hors sujet |

Commande sur mesure (ordre de grandeur, guides Fiverr 2026 et grille
mimiccartoon) : creature stylisee simple, non riggee, 100 a 200 USD chez un
independant de niveau intermediaire ; rig et animations + 100 a 300 USD ;
travail de studio 2 000 EUR et au-dela.

Piste sans achat, deja actee (voie B) : l'embrasement des deux xiuhcoatl
graves dans l'anneau exterieur de la Piedra del Sol (evocation par le feu,
aucun modele).
