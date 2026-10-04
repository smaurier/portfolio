import type { CompensationNuit } from "@/lib/nuit-mobile";

/**
 * La compensation de la nuit mobile (04/10), calculee une fois par image
 * par NuitMobile et lue par la lumiere, le foyer et les braises. Meme motif
 * que refletStore : un objet mute, pas d'etat React a 60 fps. A 1 partout
 * tant que NuitMobile n'a pas tourne : un consommateur qui lit avant la
 * premiere image ne change rien.
 */
export const nuitMobileStore: CompensationNuit = { ambiant: 1, emissif: 1, exposition: 1 };
