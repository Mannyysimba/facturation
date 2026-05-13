export const COMPANY_INFO = {
  name: 'Manil Belkacem EI',
  address: '65 Boulevard De Courcelles',
  postalCode: '75008',
  city: 'Paris',
  country: 'France',
  siret: '10041620500019',
  email: 'Manil.belkacem75@gmail.com',
  phone: '+44 7949 611479',
  iban: 'FR76 4061 8804 9100 0407 8468 487',
  bic: 'BOUS FR PP XXX',
  vatMention: 'TVA non applicable, art. 293 B du CGI.',
  tvaIntracom: '',
} as const;

export const DEFAULT_TERMS = `Cette facture concerne uniquement de la prestation de service.
TVA non applicable, art. 293 B du CGI.
En cas de retard de paiement, seront exigibles, conformément au code de commerce, une indemnité calculée sur la base de trois fois le taux de l'intérêt légal en vigueur ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40€.
Pas d'escompte en cas de paiement anticipé.
Les modes de paiement accepté est uniquement le virement bancaire.`;

export const DEFAULT_QUOTE_TERMS = `Ce devis est valable 30 jours à compter de sa date d'émission.
TVA non applicable, art. 293 B du CGI.
Le devis devient ferme et définitif à réception de l'exemplaire signé du client portant la mention « Bon pour accord ».
Acompte éventuel à régler à la commande, solde à la livraison.
Les modes de paiement accepté est uniquement le virement bancaire.`;

export const VAT_RATES = [0, 5.5, 10, 20] as const;

export const STATUS_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  en_attente: 'En attente',
  encaisse: 'Encaissé',
  en_retard: 'En retard',
};

// Labels for the same status enum when the document is a quote (devis).
// We reuse the existing columns so the SQL schema stays untouched:
//   en_attente => Envoyé (waiting for client response)
//   encaisse   => Accepté
//   en_retard  => Refusé
export const QUOTE_STATUS_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  en_attente: 'Envoyé',
  encaisse: 'Accepté',
  en_retard: 'Refusé',
};

export const STATUS_COLORS: Record<string, string> = {
  brouillon: 'bg-gray-100 text-gray-700',
  en_attente: 'bg-orange-100 text-orange-700',
  encaisse: 'bg-green-100 text-green-700',
  en_retard: 'bg-red-100 text-red-700',
};
