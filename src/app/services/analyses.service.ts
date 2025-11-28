import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, query, where, orderBy } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';

export interface Analyse {
  id?: string;
  datasetId: string;
  datasetName: string;
  type: string; // 'descriptive', 'correlation', 'anomalies', 'histogramme'
  dateCreation: Date;
  statut: 'Terminé' | 'En cours' | 'Échec';
  userId: string;
  resultats?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AnalysesService {

  constructor(private firestore: Firestore) {}

  // Récupérer toutes les analyses
  getAllAnalyses(): Observable<Analyse[]> {
    const collectionRef = collection(this.firestore, 'analyses');
    return collectionData(collectionRef, { idField: 'id' }) as Observable<Analyse[]>;
  }

  // Récupérer les analyses d'un utilisateur
  getAnalysesByUser(userId: string): Observable<Analyse[]> {
    const collectionRef = collection(this.firestore, 'analyses');
    const q = query(collectionRef, where('userId', '==', userId), orderBy('dateCreation', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Analyse[]>;
  }

  // Ajouter une analyse
  addAnalyse(analyse: Analyse) {
    const collectionRef = collection(this.firestore, 'analyses');
    return addDoc(collectionRef, analyse);
  }

  // Données statiques pour démonstration (à retirer quand vous aurez des vraies données)
  getStaticAnalyses(): Observable<Analyse[]> {
    const staticData: Analyse[] = [
      {
        id: '1',
        datasetId: 'dataset1',
        datasetName: 'Salaires Employés 2024',
        type: 'descriptive',
        dateCreation: new Date('2024-11-15'),
        statut: 'Terminé',
        userId: 'user1'
      },
      {
        id: '2',
        datasetId: 'dataset2',
        datasetName: 'Ventes Trimestrielles',
        type: 'correlation',
        dateCreation: new Date('2024-11-20'),
        statut: 'Terminé',
        userId: 'user1'
      },
      {
        id: '3',
        datasetId: 'dataset1',
        datasetName: 'Salaires Employés 2024',
        type: 'anomalies',
        dateCreation: new Date('2024-11-25'),
        statut: 'En cours',
        userId: 'user1'
      },
      {
        id: '4',
        datasetId: 'dataset3',
        datasetName: 'Données Climatiques',
        type: 'histogramme',
        dateCreation: new Date('2024-11-28'),
        statut: 'Terminé',
        userId: 'user1'
      }
    ];
    return of(staticData);
  }
}