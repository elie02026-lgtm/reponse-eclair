// Extensions explicites : Vite s'en passe, Node les exige. Sans elles,
// ce fichier ne pourrait pas être exécuté hors du navigateur — donc pas testé.
import { lireTelephone } from './telephone.ts'
import type { Demande } from '../types.ts'

// Logique pure : aucune dépendance au réseau, à Supabase ou au navigateur.
//
// CE QUE CE FICHIER EST, ET CE QU'IL N'EST PAS.
// Il ne lit pas les erreurs de Make. Il lit leurs CONSÉQUENCES dans la base,
// ce qui est à la fois moins et plus : moins, parce qu'une panne sans
// conséquence lui échappe ; plus, parce qu'une conséquence sans erreur
// déclarée — le cas le plus dangereux — ne lui échappe pas.
//
// Les deux pannes qu'on a réellement vécues sont exactement de ce type :
// un scénario éteint tout seul qui n'a levé aucune erreur, et une relance
// qui interrogeait une source morte en rendant zéro ligne, sans broncher.

const JOUR = 24 * 60 * 60 * 1000

// La relance tourne à 10h00 sur les demandes de plus de 2 jours. Au-delà de
// 3, elle aurait dû partir deux fois : ce n'est plus un retard, c'est une panne.
const RELANCE_EN_PANNE_JOURS = 3

// Silence de la capture. Sept jours, parce qu'un artisan peut réellement
// passer une semaine creuse : en dessous, on crierait au loup.
const SILENCE_JOURS = 7

// On ne demande que les six colonnes réellement lues. C'est le contrat :
// il dit à l'appelant ce qu'il doit aller chercher, et rien de plus.
// `besoin` ou `photo_url` n'ont aucune raison de traverser le réseau ici.
export type DemandeSante = Pick<
  Demande,
  'id' | 'statut' | 'email' | 'telephone' | 'recue_le' | 'relance_sms_le'
>

export const COLONNES_SANTE = 'id,statut,email,telephone,recue_le,relance_sms_le'

export type Niveau = 'rouge' | 'orange'

export type Anomalie = {
  cle: string
  titre: string
  detail: string
  niveau: Niveau
  ids: number[]
}

function jours(depuis: string, maintenant: Date): number {
  return (maintenant.getTime() - new Date(depuis).getTime()) / JOUR
}

export function anomalies(demandes: DemandeSante[], maintenant: Date): Anomalie[] {
  const trouvees: Anomalie[] = []
  const aRappeler = demandes.filter((d) => d.statut === 'a_rappeler')

  // 1. LA RELANCE N'EST PAS PARTIE.
  // Le prospect a laissé son e-mail, il attend depuis trois jours, et rien
  // n'a été envoyé. Chez nous, c'est arrivé pendant trois jours d'affilée
  // sans qu'aucune alerte ne se déclenche nulle part.
  const relanceMuette = aRappeler.filter(
    (d) =>
      d.email !== null &&
      d.relance_sms_le === null &&
      jours(d.recue_le, maintenant) > RELANCE_EN_PANNE_JOURS,
  )
  if (relanceMuette.length > 0) {
    trouvees.push({
      cle: 'relance',
      niveau: 'rouge',
      titre: `${relanceMuette.length} relance${relanceMuette.length > 1 ? 's' : ''} qui aurai${relanceMuette.length > 1 ? 'ent' : 't'} dû partir`,
      detail:
        'Ces personnes ont laissé leur e-mail il y a plus de trois jours et n’ont jamais été relancées. L’envoi automatique est probablement en panne.',
      ids: relanceMuette.map((d) => d.id),
    })
  }

  // 2. ON NE PEUT PAS LES RAPPELER.
  // Un numéro absent ou illisible sur une demande à rappeler, c'est un lead
  // qu'on a payé pour rien. La carte le dit déjà une par une ; ici on compte.
  const injoignables = aRappeler.filter((d) => lireTelephone(d.telephone).etat !== 'ok')
  if (injoignables.length > 0) {
    trouvees.push({
      cle: 'telephone',
      niveau: 'orange',
      titre: `${injoignables.length} demande${injoignables.length > 1 ? 's' : ''} sans numéro utilisable`,
      detail:
        'Le formulaire les a reçues avec un téléphone absent ou mal formé. Si elles reviennent souvent, c’est le formulaire qu’il faut corriger, pas les clients.',
      ids: injoignables.map((d) => d.id),
    })
  }

  // 3. PLUS RIEN N'ARRIVE.
  // La panne la plus dangereuse ne produit aucune erreur : elle produit du
  // vide. Un scénario désactivé, un renvoi d'appel coupé, un formulaire
  // cassé — de l'intérieur, tout va bien, simplement plus personne n'appelle.
  // On ne peut pas trancher à sa place : on nomme les deux possibilités.
  if (demandes.length > 0) {
    const derniere = demandes.reduce((a, b) => (a.recue_le > b.recue_le ? a : b))
    const age = jours(derniere.recue_le, maintenant)
    if (age > SILENCE_JOURS) {
      trouvees.push({
        cle: 'silence',
        niveau: 'orange',
        titre: `Aucune demande depuis ${Math.floor(age)} jours`,
        detail:
          'C’est peut-être une semaine calme. C’est peut-être votre renvoi d’appel ou votre formulaire qui ne fonctionne plus. Passez-vous un appel depuis un autre téléphone pour en avoir le cœur net.',
        ids: [],
      })
    }
  }

  return trouvees
}
