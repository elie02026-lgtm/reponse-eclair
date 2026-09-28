// Les constantes de l'offre, à un seul endroit.
//
// Ce fichier commence avec une seule valeur parce qu'une seule est
// nécessaire aujourd'hui : le lien de rendez-vous, désormais employé à deux
// endroits. Il était écrit en dur dans `Offre.tsx` ; le jour où on le
// change, on ne veut pas avoir à se souvenir qu'il existe ailleurs.
//
// Le prix, la garantie et le rythme d'installation viendront ici aussi.

/** Où l'on parle à un humain. Le cahier a tranché : un artisan préfère un
 *  humain à une IA, et l'appel sert à ça. */
export const LIEN_RDV = 'https://cal.com/elie-gywz5w/rdv'
