import { Injectable,inject } from '@angular/core';
import { BehaviorSubject, Observable, of, switchMap, map, delay } from 'rxjs';
import { Analyse, AnalyseType } from '../pages/models/analyse.model';
import { DatasetsService } from './datasets.service';
import { Firestore, collection, addDoc, doc, deleteDoc, collectionData } from '@angular/fire/firestore';
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
  
  private datasetService = inject(DatasetsService);
  private firestore = inject(Firestore);


  // Charger les analyses depuis Firebase au démarrage
  constructor() {}


  // ------------------- GETTERS -------------------
  getAllAnalyses(): Observable<Analyse[]> {
    const collectionRef = collection(this.firestore, 'analyses');
    return collectionData(collectionRef, { idField: 'id' }) as Observable<Analyse[]>;
  }


  getAnalysesById(id: string): Observable<Analyse | undefined> {
    return this.getAllAnalyses().pipe(
      map(list => list.find(a => a.id === id))
    );
}


    addAnalyse(analyse:Analyse) {
    console.log("SERVICE : addAnalyse() appelé");
    console.log("Analyse envoyée :", analyse);

    const collectionRef = collection(this.firestore, 'analyses');
    return addDoc(collectionRef, analyse);
  }

deleteAnalyse(id: string) {
    console.log(` SERVICE : deleteAnalyse(${id}) appelé`);

    const docRef = doc(this.firestore, `analyses/${id}`);
    return deleteDoc(docRef);
  }


  /**
   * Vérifie si une analyse identique existe déjà
   * Une analyse est considérée comme identique si elle a:
   * - Le même datasetId
   * - Le même type
   * - Les mêmes colonnes (column1 et column2)
   */
  analyseExists(datasetId: string, type: AnalyseType, column1?: string, column2?: string): Observable<boolean> {
    return this.getAllAnalyses().pipe(
      map(list =>
        list.some(a =>
          a.datasetId === datasetId &&
          a.type === type &&
          a.result !== undefined &&
          this.compareAnalyseColumns(a, column1, column2)
        )
      )
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

  const startedAt = new Date();

  return this.datasetService.getDatasetById(datasetId).pipe(
    switchMap(dataset => {
      if (!dataset) throw new Error("Dataset introuvable");

      const Analyse: Analyse = {
        datasetId,
        datasetName: dataset.name,
        type,
        status: 'En cours',
        startedAt
      };


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

  } catch (err) {
    Analyse.status = 'Échec';
    Analyse.result = { error: 'Impossible de calculer cette analyse.' };
  }

  return Analyse;
}


}