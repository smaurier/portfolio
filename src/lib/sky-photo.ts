import type { DirectionKey } from "@/app/components/stag-scene/direction-colors";

/**
 * QUI A BESOIN DE LA PHOTOGRAPHIE DE CIEL (10/09).
 *
 * `sud-sky` pose un dome photographique (2048 x 1024, 120 Ko) sur trois
 * directions seulement : le Sud, l'Ouest et l'Est. Au Centre et au Nord,
 * « ailleurs, pas de dome », dit le fichier depuis le 06/09.
 *
 * Mais le CHARGEMENT, lui, ne le savait pas : la texture partait a chaque
 * page. Mesure du 10/09 sur la production, Pixel 7 emule, CPU x4, Fast 3G :
 * le voile ne se leve que 1,1 s apres le dernier octet recu, donc chaque
 * octet inutile pendant le chargement retarde l'ouverture d'autant. 120 Ko
 * sur les 2 Mo du fil, pour une texture que la page n'affichera jamais.
 *
 * Cette liste existe pour que la decision de CHARGER et la decision
 * d'AFFICHER ne puissent plus divorcer : le type de la table des rendus
 * (`SKY_LOOK`) est construit sur elle, donc ajouter une direction ici sans
 * lui donner son rendu, ou l'inverse, ne compile pas.
 */
export const SKY_PHOTO_DIRECTIONS = ["turquoise", "cendre", "dore"] as const;

export type SkyPhotoDirection = (typeof SKY_PHOTO_DIRECTIONS)[number];

export function skyPhotoNeeded(direction: DirectionKey): direction is SkyPhotoDirection {
  return (SKY_PHOTO_DIRECTIONS as readonly DirectionKey[]).includes(direction);
}
