import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DatasetsService } from '../../../services/datasets.service';
import { AnalysesService } from '../../../services/analyses.service';
import { AnalyseType, Analyse } from '../../models/analyse.model';
import { Router } from '@angular/router';
import { NgIf, NgFor } from '@angular/common';
import Papa from 'papaparse';
@Component({
  selector: 'app-analyses-new',
  imports: [CommonModule,ReactiveFormsModule,FormsModule, NgIf, NgFor],
  templateUrl: './analyses-new.html',
  styleUrl: './analyses-new.css',
})
export class AnalysesNew {
  form!: FormGroup;
  datasets: any[] = [];
  numericColumns: string[] = [];
  isLoading = false; // pour spinner
  analyseExists = false; // Pour afficher un message si l'analyse existe déjà

  analyseTypes: AnalyseType[] = [
    'Statistiques descriptives',
    'Valeurs aberrantes',
    'Corrélation',
    'Histogramme automatique'
  ];

  constructor(
    private fb: FormBuilder,
    private datasetService: DatasetsService,
    private analysesService: AnalysesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Initialiser le formulaire
    this.form = this.fb.group({
      datasetId: ['', Validators.required],
      type: ['', Validators.required],
      column1: ['', Validators.required],
      column2: [''] // Optionnel, requis seulement pour Corrélation
    });

    // Charger tous les datasets depuis Firebase
    this.datasetService.getAllDatasets().subscribe(data => {
      this.datasets = data;
    });

    // Écouter les changements du dataset pour mettre à jour les colonnes disponibles
    this.form.get('datasetId')?.valueChanges.subscribe(datasetId => {
      this.onDatasetChange(datasetId);
    });

    // Écouter les changements du type d'analyse pour valider column2
    this.form.get('type')?.valueChanges.subscribe(type => {
      this.onAnalyseTypeChange(type);
    });
  }

  /**
   * Appelé quand le dataset sélectionné change
   */
  onDatasetChange(datasetId: string): void {
    if (!datasetId) {
      this.numericColumns = [];
      this.form.patchValue({ column1: '', column2: '' });
      return;
    }
    
    // Extraire les colonnes numériques du dataset sélectionné
    this.extractNumericColumns(datasetId);
    this.form.patchValue({ column1: '', column2: '' });
  }

  /**
   * Appelé quand le type d'analyse change
   * Pour Corrélation, column2 est requis
   * Pour les autres analyses, column2 est optionnel
   */
  onAnalyseTypeChange(type: string): void {
    const column2Control = this.form.get('column2');
    if (type === 'Corrélation') {
      column2Control?.setValidators([Validators.required]);
    } else {
      column2Control?.clearValidators();
    }
    column2Control?.updateValueAndValidity();
    this.form.patchValue({ column2: '' });
  }

  /**
   * Retourne les colonnes numériques avec leurs valeurs pour un dataset donné.
   * Une colonne est considérée numérique si toutes les valeurs de ses lignes
   * sont convertibles en nombre (Number(value) n'est pas NaN).
   */
extractNumericColumns(datasetId: string): { columnName: string; values: number[] }[] {
  const ds = this.datasets.find(d => d.id === datasetId);
  if (!ds || !ds.contenu) return [];

  const lines: string[] = ds.contenu.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const separator: string = lines[0].includes(';') ? ';' : ',';

  // Colonnes : enlever les colonnes vides
  const cols: string[] = lines[0]
    .split(separator)
    .map((c: string) => c.trim())
    .filter(c => c.length > 0);

  // Lignes : garder uniquement celles ayant le bon nombre de colonnes
  const rows: string[][] = lines
    .slice(1)
    .map((line: string) =>
      line.split(separator).map((value: string) => value.trim())
    )
    .filter(r => r.length === cols.length);

  const numericColsWithValues: { columnName: string; values: number[] }[] = [];
  
  for (let colIndex = 0; colIndex < cols.length; colIndex++) {
    const columnValues: number[] = [];
    const allNumeric = rows.every((r: string[]) => {
      const v: string = r[colIndex];
      if (v === null || v === undefined || v === '') return true;
      return !isNaN(Number(v));
    });

    if (allNumeric) {
      // Extraire les valeurs numériques pour cette colonne
      rows.forEach((r: string[]) => {
        const v: string = r[colIndex];
        if (v !== null && v !== undefined && v !== '') {
          columnValues.push(Number(v));
        }
      });
      
      numericColsWithValues.push({
        columnName: cols[colIndex],
        values: columnValues
      });
    }
  }

  // Stocker uniquement les noms des colonnes numériques
  this.numericColumns = numericColsWithValues.map(col => col.columnName);

  console.log("Colonnes numériques détectées :", this.numericColumns);
  console.log("Colonnes numériques avec valeurs :", numericColsWithValues);
  console.table(numericColsWithValues);

  return numericColsWithValues;
}

  /**
   * Retourne true si l'analyse actuelle nécessite 2 colonnes (Corrélation)
   */
  needsTwoColumns(): boolean {
    return this.form.get('type')?.value === 'Corrélation';
  }
submit() {
  if (this.form.invalid) return;

  const { datasetId, type, column1, column2 } = this.form.value;

  console.log('Vérification de l\'analyse:', { datasetId, type, column1, column2 });

  this.isLoading = true;

  // Vérifier si l’analyse existe déjà
  this.analysesService.analyseExists(datasetId, type, column1, column2)
    .subscribe(exists => {

      if (exists) {
        this.isLoading = false;
        this.analyseExists = true;
        console.warn('Cette analyse existe déjà dans l’historique');
        return;
      }

      this.analyseExists = false;

      // Lancer l’analyse
      this.analysesService.runAnalyse(datasetId, type, column1, column2)
        .subscribe({
          next: (analyse: Analyse) => {

            console.log('Analyse terminée :', analyse);

            // ➤ Ajouter manuellement dans Firebase ici
            this.analysesService.addAnalyse(analyse)
              .then(() => {
                this.isLoading = false;
                this.router.navigate(['data-scientist/analyses']);
              });
          },
          error: (err) => {
            console.error('Erreur analyse :', err);
            this.isLoading = false;
          }
        });

    });

}
}