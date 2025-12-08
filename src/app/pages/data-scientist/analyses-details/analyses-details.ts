import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AnalysesService } from '../../../services/analyses.service';
import { DatasetsService } from '../../../services/datasets.service';
import { Analyse } from '../../models/analyse.model';
import { Chart, registerables } from 'chart.js';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

Chart.register(...registerables);

@Component({
  selector: 'app-analyses-details',
  imports: [CommonModule],
  templateUrl: './analyses-details.html',
  styleUrl: './analyses-details.css',
})
export class AnalysesDetails implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  router = inject(Router);
  private analysesService = inject(AnalysesService);
  private datasetsService = inject(DatasetsService);
  private destroy$ = new Subject<void>();

  @ViewChild('histCanvas') histCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('scatterCanvas') scatterCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('boxCanvas') boxCanvas!: ElementRef<HTMLCanvasElement>;

  datasetId: string | null = null;
  datasetName: string = '';
  analyses: Analyse[] = [];
  filteredAnalyses: Analyse[] = [];
  isLoading = true;
  errorMessage = '';
  selectedAnalyse: Analyse | null = null;
  selectedAnalyseResult: any = null;
  chart!: Chart;

  ngOnInit(): void {
    // Récupérer l'ID du dataset depuis les paramètres de route
    this.datasetId = this.route.snapshot.paramMap.get('id');

    if (!this.datasetId) {
      this.errorMessage = 'ID du dataset non spécifié';
      this.isLoading = false;
      return;
    }

    // Charger le nom du dataset
    this.datasetsService.getDatasetById(this.datasetId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dataset) => {
          this.datasetName = dataset.name || 'Dataset inconnu';
        },
        error: () => {
          this.datasetName = 'Dataset inconnu';
        }
      });

    // Charger toutes les analyses et filtrer par dataset ID
    this.analysesService.getAllAnalyses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (analyses) => {
          this.analyses = analyses;
          this.filterAnalysesByDataset();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erreur lors du chargement des analyses:', err);
          this.errorMessage = 'Impossible de charger les analyses';
          this.isLoading = false;
        }
      });
  }

  ngAfterViewInit(): void {
    // Rendu du graphique une fois que les canvas sont disponibles
    if (this.selectedAnalyseResult) {
      setTimeout(() => {
        this.renderChart();
      }, 100);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.chart) {
      this.chart.destroy();
    }
  }

  /**
   * Filtre les analyses pour ne montrer que celles du dataset courant
   */
  filterAnalysesByDataset(): void {
    if (this.datasetId) {
      this.filteredAnalyses = this.analyses.filter(
        a => a.datasetId === this.datasetId
      );
    }
  }

  /**
   * Formate la date au format français
   */
  formatDate(date: Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Retourne la classe CSS pour le badge de statut
   */
  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'Terminé': 'status-success',
      'En cours': 'status-pending',
      'Échec': 'status-error'
    };
    return statusMap[status] || 'status-default';
  }

  /**
   * Retourne le label du statut en français
   */
  getStatusLabel(status: string): string {
    return status;
  }

  /**
   * Supprime une analyse
   */
  deleteAnalyse(id: string, event: Event): void {
    event.stopPropagation();
    
    if (confirm('Êtes-vous sûr de vouloir supprimer cette analyse ?')) {
      this.analysesService.deleteAnalyse(id);
      this.filteredAnalyses = this.filteredAnalyses.filter(a => a.id !== id);
    }
  }

  /**
   * Affiche les détails d'une analyse
   */
  viewAnalyseDetails(analyseId: string, event: Event): void {
    event.stopPropagation();
    
    const analyse = this.filteredAnalyses.find(a => a.id === analyseId);
    if (analyse) {
      this.selectedAnalyse = analyse;
      // La résultat est déjà stockée dans l'objet analyse
      this.selectedAnalyseResult = analyse;
      setTimeout(() => {
        this.renderChart();
      }, 100);
    }
  }

  /**
   * Ferme le modal des détails
   */
  closeDetails(): void {
    this.selectedAnalyse = null;
    this.selectedAnalyseResult = null;
    if (this.chart) {
      this.chart.destroy();
    }
  }

  /**
   * Rendu du graphique basé sur le type d'analyse
   */
  renderChart(): void {
    if (!this.selectedAnalyseResult) return;
    
    // Détruire le chart existant si nécessaire
    if (this.chart) {
      this.chart.destroy();
    }

    const result = this.selectedAnalyseResult;

    if (result.type === 'Histogramme automatique') {
      const labels = result.result.labels;
      const data = result.result.bins;

      this.chart = new Chart(this.histCanvas.nativeElement, {
        type: 'bar',
        data: { 
          labels, 
          datasets: [{ 
            label: 'Histogramme', 
            data,
            backgroundColor: 'rgba(66, 153, 225, 0.6)',
            borderColor: 'rgba(66, 153, 225, 1)',
            borderWidth: 1
          }] 
        },
        options: { 
          responsive: true,
          maintainAspectRatio: false,
          scales: { 
            y: { 
              beginAtZero: true,
              ticks: { stepSize: 1 }
            } 
          } 
        }
      });
    }

    if (result.type === 'Corrélation') {
      const { x, y, columnX, columnY } = result.result;
      this.chart = new Chart(this.scatterCanvas.nativeElement, {
        type: 'scatter',
        data: { 
          datasets: [{ 
            label: `Scatter ${columnX} vs ${columnY}`, 
            data: x.map((v: number, i: number) => ({ x: v, y: y[i] })),
            backgroundColor: 'rgba(66, 153, 225, 0.6)',
            borderColor: 'rgba(66, 153, 225, 1)',
            borderWidth: 1
          }] 
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              beginAtZero: true,
              title: {
                display: true,
                text: columnX,
                font: { size: 14, weight: 'bold' }
              }
            },
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: columnY,
                font: { size: 14, weight: 'bold' }
              }
            }
          }
        }
      });
    }

    if (result.type === 'Valeurs aberrantes') {
      const { min, q1, median, q3, max, outliers, column } = result.result;
      const outlierData = outliers ? outliers.map((v: number) => ({ x: 0, y: v })) : [];

      this.chart = new Chart(this.boxCanvas.nativeElement, {
        type: 'scatter',
        data: {
          datasets: [
            // Whiskers (vertical line)
            {
              label: 'Whiskers',
              data: [
                { x: 0, y: min },
                { x: 0, y: max }
              ],
              showLine: true,
              borderColor: '#01070cff',
              borderWidth: 2,
              pointRadius: 0
            },
            // Min horizontal bar
            {
              label: 'MinBar',
              data: [
                { x: -0.1, y: min },
                { x: 0.1, y: min }
              ],
              showLine: true,
              borderColor: '#01070cff',
              borderWidth: 2,
              pointRadius: 0
            },
            // Max horizontal bar
            {
              label: 'MaxBar',
              data: [
                { x: -0.1, y: max },
                { x: 0.1, y: max }
              ],
              showLine: true,
              borderColor: '#01070cff',
              borderWidth: 2,
              pointRadius: 0
            },
            // Box (Q1 → Q3)
            {
              label: 'Box',
              data: [
                { x: -0.15, y: q1 },
                { x: 0.15, y: q1 },
                { x: 0.15, y: q3 },
                { x: -0.15, y: q3 },
                { x: -0.15, y: q1 }
              ],
              showLine: true,
              borderColor: '#01070cff',
              backgroundColor: 'rgba(66, 153, 225, 0.2)',
              borderWidth: 2,
              pointRadius: 0,
              fill: true
            },
            // Médiane
            {
              label: 'Médiane',
              data: [
                { x: -0.15, y: median },
                { x: 0.15, y: median }
              ],
              showLine: true,
              borderColor: '#4299e1',
              borderWidth: 3,
              pointRadius: 0
            },
            // Valeurs aberrantes
            {
              label: 'Outliers',
              data: outlierData,
              pointRadius: 5,
              pointBackgroundColor: 'rgba(66, 153, 225, 0.6)',
              pointBorderColor: 'rgba(66, 153, 225, 1)',
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: {
                filter: (legendItem: any) => {
                  return legendItem.text === 'Outliers';
                }
              }
            },
            title: {
              display: true,
              text: `Boxplot - ${column}`,
              font: { size: 16 }
            }
          },
          scales: {
            x: { 
              display: false, 
              min: -0.5, 
              max: 0.5 
            },
            y: {
              title: { 
                display: true, 
                text: 'Valeurs',
                font: { size: 12 }
              },
              padding: 15
            }
          }
        }
      } as any);
    }

    if (result.type === 'Statistiques descriptives') {
      // Pour les statistiques descriptives, on affiche juste les valeurs en texte
      // Pas de graphique à rendre
    }
  }

  /**
   * Méthode helper pour vérifier le type dans le template
   */
  typeof(value: any): string {
    return typeof value;
  }

  /**
   * Formate un label en titlecase
   */
  formatLabel(label: any): string {
    if (!label) return '';
    const str = String(label);
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Retour à la liste des analyses
   */
  goBack(): void {
    this.router.navigate(['/data-scientist/analyses']);
  }
}