/**
 * L'ACCUEIL MOBILE (04/10/2026). Sylvain, sur son telephone : « texte
 * omnipresent, on ne voit que ca ». Sur 392 px, le paragraphe du hero fait
 * six lignes et la carte couvre 70 % de la hauteur : la scene disparait
 * derriere. Variante choisie sur captures (V1 parmi trois) : la premiere
 * image montre le titre, la ligne de seuil et l'appel ; le paragraphe
 * n'entre dans la carte qu'au premier defilement. Meme DOM (le texte reste
 * lu par les lecteurs d'ecran, dans le bloc sr-only), rien de perdu :
 * l'ordre change, d'abord l'image, puis le texte. Ce module est pur ; le
 * composant qui l'applique est hero-texte-mobile.tsx, et seule la feuille
 * de style decide que ca ne vaut que sous 768 px.
 */
import { clampProgress } from "./camera-path";

/** Deux centiemes de l'arc : un geste, pas un cran de molette. */
export const HERO_TEXTE_SEUIL = 0.02;

export function heroTexteVisible(progress: number): boolean {
  return clampProgress(progress) >= HERO_TEXTE_SEUIL;
}
