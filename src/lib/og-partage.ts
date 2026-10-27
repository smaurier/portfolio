/**
 * L'ALTERNATIVE TEXTUELLE DE LA CARTE DE PARTAGE (27/10).
 *
 * Elle etait figee en francais sur l'accueil des trois langues, parce que la
 * convention de fichier de Next veut un `alt` de type string a la racine du
 * module : une constante ne peut pas suivre une route dynamique. Le detail
 * du defaut, la mesure et la primitive qui le repare sont dans
 * `og-partage.test.ts`.
 *
 * Un seul constructeur pour tout le site, pour que deux endroits ne
 * fabriquent pas deux alternatives differentes de la meme image : la carte
 * ecrit ses lignes de haut en bas, l'alt les joint dans cet ordre.
 */
export function altPartage(...lignes: (string | undefined)[]): string {
  return lignes.filter((l): l is string => Boolean(l && l.trim())).join(" · ");
}
