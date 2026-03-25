import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Language = 'en' | 'fr';

@Injectable({ providedIn: 'root' })
export class LanguageService {

  private langSubject = new BehaviorSubject<Language>(
    (localStorage.getItem('lang') as Language) || 'en'
  );

  lang$ = this.langSubject.asObservable();

  get current(): Language {
    return this.langSubject.getValue();
  }

  set(lang: Language): void {
    localStorage.setItem('lang', lang);
    this.langSubject.next(lang);
  }

  t(key: string): string {
    return (TRANSLATIONS[this.current] as any)[key] || key;
  }
}

const TRANSLATIONS = {
  en: {
    // Chat
    chatPlaceholder: 'Ask about UAP1 data...',
    thinking: 'Thinking...',
    noData: 'No data found for your query.',
    errorMsg: 'Sorry, I could not find an answer.',
    // Dashboard
    totalBundles: 'Total Bundles',
    validatedBundles: 'Validated Bundles',
    notValidated: 'Not Validated',
    inPagoda: 'Still in Pagoda',
    leftPagoda: 'Left Pagoda',
    totalOrders: 'Total Orders',
    historyRecords: 'History Records',
    totalTools: 'Total Tools',
    lockedTools: 'Locked Tools',
    totalMachines: 'Total Machines',
    excludedMachines: 'Excluded Machines',
    bundleTimeline: 'Bundle Timeline',
    firstBundleInserted: 'First Bundle Inserted',
    lastBundleUpdated: 'Last Bundle Updated',
    // Section titles
    uap1Section: 'UAP1 — Bundles & Orders',
    caoSection: 'CAO — Cutting Area Optimization',
    kpiSection: 'Key Performance Indicators',
    chartsSection: 'Charts & Analytics',

    bundlesPerLeadset: 'Bundles per Leadset',
    qtyPerStation: 'Quantity Produced per Station',
    validationStatus: 'Validation Status',
    pagodaStatus: 'Pagoda Status',
    lastExitPagoda: 'Last Exit per Pagoda Place',
    toolLockStatus: 'Tool Lock Status',
    machineStatus: 'Machine Status',
    goodVsBadParts: 'Good vs Bad Parts (Top 10 Tools)',
    toolsMaintenance: 'Tools Approaching Maintenance (≥75% usage)',
    noBadParts: 'No bad parts recorded.',
    noMaintenance: 'No tools approaching maintenance limit.',
    noBundlesLeft: 'No bundles have left any Pagoda yet.',
  },
  fr: {
    // Chat
    chatPlaceholder: 'Posez une question sur les données UAP1...',
    thinking: 'Réflexion en cours...',
    noData: 'Aucune donnée trouvée pour votre requête.',
    errorMsg: 'Désolé, je n\'ai pas pu trouver une réponse.',
    // Dashboard
    totalBundles: 'Total des Bundles',
    validatedBundles: 'Bundles Validés',
    notValidated: 'Non Validés',
    inPagoda: 'Encore en Pagode',
    leftPagoda: 'Quitté la Pagode',
    totalOrders: 'Total des Commandes',
    historyRecords: 'Enregistrements Historiques',
    totalTools: 'Total des Outils',
    lockedTools: 'Outils Verrouillés',
    totalMachines: 'Total des Machines',
    excludedMachines: 'Machines Exclues',
    bundleTimeline: 'Chronologie des Bundles',
    firstBundleInserted: 'Premier Bundle Inséré',
    lastBundleUpdated: 'Dernier Bundle Mis à Jour',
    // Section titles
    uap1Section: 'UAP1 — Bundles & Commandes',
    caoSection: 'CAO — Optimisation de la Zone de Coupe',
    kpiSection: 'Indicateurs Clés de Performance',
    chartsSection: 'Graphiques & Analyses',

    bundlesPerLeadset: 'Bundles par Leadset',
    qtyPerStation: 'Quantité Produite par Station',
    validationStatus: 'Statut de Validation',
    pagodaStatus: 'Statut Pagode',
    lastExitPagoda: 'Dernière Sortie par Pagode',
    toolLockStatus: 'Statut Verrouillage Outils',
    machineStatus: 'Statut des Machines',
    goodVsBadParts: 'Bonnes vs Mauvaises Pièces (Top 10)',
    toolsMaintenance: 'Outils Approchant la Maintenance (≥75%)',
    noBadParts: 'Aucune mauvaise pièce enregistrée.',
    noMaintenance: 'Aucun outil proche de la limite de maintenance.',
    noBundlesLeft: 'Aucun bundle n\'a encore quitté la Pagode.',
  }


};