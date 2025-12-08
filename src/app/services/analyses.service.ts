import { Injectable,inject } from '@angular/core';
import { BehaviorSubject, Observable, of, switchMap, map, delay } from 'rxjs';
import { Analyse, AnalyseType } from '../pages/models/analyse.model';
import { DatasetsService } from './datasets.service';
import { Firestore, collection, addDoc, doc, deleteDoc, getDocs } from '@angular/fire/firestore';
import { mean,
  minValue,
  maxValue,
  median,
  variance,
  std,
  detectOutliers,
  correlation as correlationCalc,
  histogram as histogramCalc } from '../utils/utils-stats';


@Injectable({
  providedIn: 'root',
})
export class AnalysesService {
  
  private analyses$ = new BehaviorSubject<Analyse[]>(this.loadFromStorage());
  private datasetService = inject(DatasetsService);
  private firestore = inject(Firestore);

  // Charger les analyses depuis Firebase au démarrage
  constructor() {
    this.fetchFromFirestore();
  }

  // ------------------- STORAGE LOCAL -------------------
  private saveToStorage() {
    localStorage.setItem('analyses', JSON.stringify(this.analyses$.value));
  }

  private loadFromStorage(): Analyse[] {
    const data = localStorage.getItem('analyses');
    return data ? JSON.parse(data) : [];
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  // ------------------- GETTERS -------------------
  getAllAnalyses(): Observable<Analyse[]> {
    return this.analyses$.asObservable();
  }

  getById(id: string): Observable<Analyse | undefined> {
    return this.getAllAnalyses().pipe(
      map(list => list.find(a => a.id === id))
    );
  }

  /**
   * Vérifie si une analyse identique existe déjà
   * Une analyse est considérée comme identique si elle a:
   * - Le même datasetId
   * - Le même type
   * - Les mêmes colonnes (column1 et column2)
   */
  analyseExists(datasetId: string, type: AnalyseType, column1?: string, column2?: string): boolean {
    return this.analyses$.value.some(a => 
      a.datasetId === datasetId && 
      a.type === type && 
      a.result !== undefined && // L'analyse doit être terminée avec résultat
      this.compareAnalyseColumns(a, column1, column2)
    );
  }

  /**
   * Compare les colonnes d'une analyse existante avec celles demandées
   */
  private compareAnalyseColumns(analyse: Analyse, column1?: string, column2?: string): boolean {
    // Pour les analyses qui n'utilisent qu'une colonne
    if (!column2) {
      return analyse.result?.column === column1;
    }
    // Pour les analyses de corrélation avec deux colonnes
    return (analyse.result?.columnX === column1 && analyse.result?.columnY === column2) ||
           (analyse.result?.columnX === column2 && analyse.result?.columnY === column1);
  }

  // ------------------- RUN Analyse -------------------
  runAnalyse(datasetId: string, type: AnalyseType, column1?: string, column2?: string): Observable<Analyse> {
  const id = this.generateId();
  const startedAt = new Date();

  return this.datasetService.getDatasetById(datasetId).pipe(
    switchMap(dataset => {
      if (!dataset) throw new Error("Dataset introuvable");

      const Analyse: Analyse = {
        id,
        datasetId,
        datasetName: dataset.name,
        type,
        status: 'En cours',
        startedAt
      };

      if (!this.analyses$.value.find(a => a.id === Analyse.id)) {
  this.analyses$.next([...this.analyses$.value, Analyse]);
}

      this.saveToStorage();

      return of(Analyse).pipe(
        delay(3000), 
        map(a => this.finishAnalyse(a, dataset, column1, column2))
      );
    })
  );
}


  // ------------------- FINISH Analyse -------------------
  /**
   * Parse le contenu CSV du dataset en structure { columns, rows }
   */
  private parseDataset(dataset: any): { columns: string[], rows: any[][] } {
    if (!dataset.contenu) {
      throw new Error("Contenu du dataset manquant");
    }

    const lines = dataset.contenu.trim().split(/\r?\n/).filter((l: string) => l.trim());
    if (lines.length < 2) {
      throw new Error("Dataset insuffisant (moins de 2 lignes)");
    }

    // Détecter le séparateur (virgule ou point-virgule)
    const separator = lines[0].includes(';') ? ';' : ',';

    // Extraire les colonnes
    const columns = lines[0]
      .split(separator)
      .map((c: string) => c.trim())
      .filter((c: string) => c.length > 0);

    // Extraire les lignes de données
    const rows = lines
      .slice(1)
      .map((line: string) => {
        const values = line.split(separator).map((v: string) => v.trim());
        // Convertir les valeurs en nombres si possible
        return values.map((v: string) => {
          const num = Number(v);
          return isNaN(num) ? v : num;
        });
      })
      .filter((row: any[]) => row.length === columns.length);

    return { columns, rows };
  }

  private finishAnalyse(Analyse: Analyse, dataset: any, column1?: string, column2?: string): Analyse {
  try {
    // Parser le dataset CSV
    const parsedData = this.parseDataset(dataset);
    const { columns, rows } = parsedData;
    
    // Stocker les colonnes dans l'analyse
    Analyse.column1 = column1;
    Analyse.column2 = column2;
    
    switch (Analyse.type) {
      case 'Statistiques descriptives': {
        const col = column1 || columns[0];
        const colIndex = columns.indexOf(col);
        const values = rows.map((r: any) => r[colIndex]).filter((v: any) => typeof v === 'number');
        Analyse.result = {
          column: col,
          min: minValue(values),
          max: maxValue(values),
          mean: mean(values),
          median: median(values),
          variance: variance(values),
          std: std(values)
        };
        break;
      }

      case 'Valeurs aberrantes': {
        const col = column1 || columns[0];
        const colIndex = columns.indexOf(col);
        const values = rows.map((r: any) => r[colIndex]).filter((v: any) => typeof v === 'number');
        Analyse.result = { column: col, ...detectOutliers(values) };
        break;
      }
      case 'Corrélation': {
        const idxX = columns.indexOf(column1 || columns[0]);
        const idxY = columns.indexOf(column2 || columns[1]);
        const x = rows.map((r: any) => r[idxX]).filter((v: any) => typeof v === 'number') as number[];
        const y = rows.map((r: any) => r[idxY]).filter((v: any) => typeof v === 'number') as number[];
        Analyse.result = {
          columnX: column1,
          columnY: column2,
          x,
          y,
          coefficient: correlationCalc(x, y)
        };
        break;
      }
      case 'Histogramme automatique': {
        const col = column1 || columns[0];
        const colIndex = columns.indexOf(col);
        const values = rows.map((r: any) => r[colIndex]).filter((v: any) => typeof v === 'number');
        Analyse.result = { column: col, ...histogramCalc(values, 10) };
        break;
      }
    }

    Analyse.status = 'Terminé';
    Analyse.finishedAt = new Date();
    this.saveAnalyseToFirestore(Analyse);

  } catch (err) {
    Analyse.status = 'Échec';
    Analyse.result = { error: 'Impossible de calculer cette analyse.' };
  }
  const updated = this.analyses$.value.map(a => a.id === Analyse.id ? Analyse : a);
  this.analyses$.next(updated);

  this.saveToStorage();

  return Analyse;
}


  // ------------------- SAUVEGARDE FIREBASE -------------------
  private async saveAnalyseToFirestore(Analyse: Analyse) {
  const colRef = collection(this.firestore, 'analyses');
  try {
    const docRef = await addDoc(colRef, Analyse);
    console.log('Analyse sauvegardée dans Firebase :', docRef.id);
    Analyse.firestoreId = docRef.id;  // stocker l'ID pour pouvoir supprimer plus tard
  } catch (err) {
    console.error('Erreur sauvegarde Firebase :', err);
  }
}
deleteAnalyseFromFirebase(analyse: Analyse) {
  if (!analyse.firestoreId) return;

  const docRef = doc(this.firestore, 'analyses', analyse.firestoreId);
  deleteDoc(docRef)
    .then(() => console.log('Analyse supprimée de Firebase :', analyse.firestoreId))
    .catch(err => console.error('Erreur suppression Firebase :', err));
}
deleteAnalyse(id: string) {
  const analyse = this.analyses$.value.find(a => a.id === id);
  if (!analyse) return;

  // Supprimer de Firebase si nécessaire
  this.deleteAnalyseFromFirebase(analyse);

  // Supprimer du BehaviorSubject et du localStorage
  const updated = this.analyses$.value.filter(a => a.id !== id);
  this.analyses$.next(updated);
  this.saveToStorage();
}
  
  // ------------------- CHARGER DEPUIS FIREBASE -------------------
  private async fetchFromFirestore() {
    try {
      const colRef = collection(this.firestore, 'analyses');
      const querySnapshot = await getDocs(colRef);
      if (querySnapshot.empty) return;

      const list: Analyse[] = querySnapshot.docs.map(d => {
        const data = d.data() as any;
        const startedAt = data.startedAt && (data.startedAt.toDate ? data.startedAt.toDate() : new Date(data.startedAt));
        const finishedAt = data.finishedAt && (data.finishedAt.toDate ? data.finishedAt.toDate() : new Date(data.finishedAt));

        return {
          id: data.id || d.id,
          firestoreId: d.id,
          datasetId: data.datasetId,
          datasetName: data.datasetName,
          type: data.type,
          status: data.status,
          startedAt: startedAt || new Date(),
          finishedAt: finishedAt,
          column1: data.column1,
          column2: data.column2,
          result: data.result
        } as Analyse;
      });

      this.analyses$.next(list);
      this.saveToStorage();
      console.log('Analyses chargées depuis Firebase:', list.length);
    } catch (err) {
      console.error('Erreur lors du chargement des analyses depuis Firebase', err);
    }
  }

}