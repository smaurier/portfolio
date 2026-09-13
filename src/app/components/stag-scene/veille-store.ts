/**
 * L'etat de la veille (13/09, lib/veille) partage entre le compte
 * d'inactivite (`veille.tsx`), la camera (derive), le grade (profondeur de
 * champ) et le son. `active` est ecrit par le compte ; `k`, la part de
 * veille lissee, par la camera une fois par image ; `depuis` marque
 * l'entree. Meme pattern que frostStore.
 */
export const veilleStore: { active: boolean; k: number; depuis: number } = { active: false, k: 0, depuis: 0 };
