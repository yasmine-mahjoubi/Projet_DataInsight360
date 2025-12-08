import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { DatasetsService } from '../../../services/datasets.service';
import { ConfirmModal } from '../../models/confirm-modal/confirm-modal';
import { SuccesModal } from '../../models/succes-modal/succes-modal';
import { ErrorModal } from '../../models/error-modal/error-modal';

interface Dataset {
  id: string;
  name: string;
  category: string;
  description: string;
  rows: number;
  columns: number;
  date: string;
  importDate: Date;
  loading?: boolean;
  contenu?: string;
}

interface ColumnType {
  name: string;
  type: string;
  unique?: number;
  nullCount?: number;
}

@Component({
  selector: 'app-dataset-details',
  imports: [CommonModule,
    ConfirmModal,
    SuccesModal, 
    ErrorModal],
  templateUrl: './dataset-details.html',
  styleUrl: './dataset-details.css',
})
export class DatasetDetails implements OnInit {
  dataset: Dataset | null = null;
  dataPreview: any[][] = [];
  dataHeaders: string[] = [];
  columnTypes: ColumnType[] = [];
  errorMessage: string = '';

  // Propriétés pour les modales
  showConfirmModal = false;
  showSuccessModal = false;
  showErrorModal = false;
  successMessage = '';
  errorMsg = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private datasetsService: DatasetsService,
  ) {}

  ngOnInit() {
    this.loadDataset();
  }

  loadDataset() {
    const datasetId = this.route.snapshot.paramMap.get('id');
    
    if (!datasetId) {
      this.errorMessage = 'ID du dataset non spécifié';
      return;
    }

    // Récupérer depuis le localStorage
    const storedDataset = localStorage.getItem('dataset');
    
    if (storedDataset) {
      try {
        this.dataset = JSON.parse(storedDataset);
        this.generateMockData();
      } catch (error) {
        this.errorMessage = 'Erreur lors du chargement des données du dataset';
        console.error('Error parsing dataset:', error);
      }
    } else {
      this.errorMessage = 'Dataset non trouvé. Veuillez sélectionner un dataset depuis la liste.';
    }
  }

  generateMockData() {
    if (!this.dataset) return;

   const contenu = this.dataset.contenu?.trim() || "";
    const firstLine = contenu.split('\n')[0]; 
    this.dataHeaders = firstLine.split(',');


    // Générer des données mock (5 premières lignes)
    this.dataPreview = Array.from({ length: 5 }, (_, rowIndex) =>
      Array.from({ length: this.dataset!.columns }, (_, colIndex) => {
        // Générer différents types de données pour varier
        const types = ['string', 'number', 'boolean', 'date'];
        const type = types[colIndex % types.length];
        
        switch (type) {
          case 'string':
            return `Valeur_${rowIndex + 1}_${colIndex + 1}`;
          case 'number':
            return (rowIndex * this.dataset!.columns + colIndex + 1) * 123.45;
          case 'boolean':
            return rowIndex % 2 === 0 ? 'Vrai' : 'Faux';
          case 'date':
            return new Date(2024, colIndex, rowIndex + 1).toLocaleDateString('fr-FR');
          default:
            return `Data_${rowIndex + 1}_${colIndex + 1}`;
        }
      })
    );

    // Générer les types de colonnes mock
    this.columnTypes = this.dataHeaders.map((header, index) => {
      const types = ['string', 'number', 'boolean', 'date'];
      const type = types[index % types.length];
      
      return {
        name: header,
        type: type,
        unique: Math.floor(Math.random() * 100) + 1,
        nullCount: Math.floor(Math.random() * 10)
      };
    });
  }

  getCategoryClass(category: string): string {
    return `dataset-category ${category.toLowerCase().replace(' ', '-')}`;
  }

  getCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = {
      'finance': 'Finance',
      'sante': 'Santé',
      'transport': 'Transport',
      'education': 'Éducation',
      'technologie': 'Technologie',
      'marketing': 'Marketing',
      'ressources-humaines': 'Ressources Humaines'
    };
    return labels[category.toLowerCase()] || category;
  }

  getTypeClass(type: string): string {
    const typeMap: { [key: string]: string } = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'date': 'date',
      'text': 'string',
      'integer': 'number',
      'float': 'number',
      'double': 'number'
    };
    return typeMap[type.toLowerCase()] || 'string';
  }

  getColumnType(header: string): string {
    const column = this.columnTypes.find(col => col.name === header);
    return column ? this.translateType(column.type) : '';
  }

  translateType(type: string): string {
    const translations: { [key: string]: string } = {
      'string': 'Texte',
      'number': 'Nombre',
      'boolean': 'Booléen',
      'date': 'Date'
    };
    return translations[type.toLowerCase()] || type;
  }

  calculateSize(): string {
    if (!this.dataset) return '0 KB';
    
    // Estimation basique : 1KB par 100 lignes
    const sizeKB = Math.max(1, Math.round(this.dataset.rows / 100));
    return sizeKB < 1024 ? `${sizeKB} KB` : `${(sizeKB / 1024).toFixed(1)} MB`;
  }

  goBack() {
    this.location.back();
  }

  analyzeDataset() {
    if (this.dataset) {
      // Navigation vers la page d'analyse
      this.router.navigate(['/analyze', this.dataset.id]);
    }
  }

  downloadDataset() {
    if (!this.dataset) return;

    // Afficher un indicateur de chargement
    this.showLoadingIndicator();

    try {
      // Essayer de récupérer depuis Firebase d'abord
      this.downloadFromFirebase().catch((error) => {
        console.error('Erreur Firebase:', error);
        // Fallback: générer depuis l'aperçu
        this.downloadFromPreview();
      });
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      // Afficher la modale d'erreur
      this.errorMsg = 'Erreur lors du téléchargement. Veuillez réessayer.';
      this.showErrorModal = true;
    }
  }

  private async downloadFromFirebase() {
    if (!this.dataset) return;

    return new Promise((resolve, reject) => {
      this.datasetsService.getDatasetById(this.dataset!.id).subscribe({
        next: (datasetDoc) => {
          if (datasetDoc?.contenu) {
            try {
              this.downloadFile(datasetDoc.contenu, `${this.dataset!.name}.csv`, 'text/csv');
              // Afficher la modale de succès
              this.successMessage = `Dataset "${this.dataset!.name}" téléchargé avec succès !`;
              this.showSuccessModal = true;
              resolve(true);
            } catch (error) {
              // Afficher la modale d'erreur
              this.errorMsg = 'Erreur lors de la création du fichier.';
              this.showErrorModal = true;
              reject(error);
            }
          } else {
            console.error('Contenu non disponible');
            // Fallback vers l'aperçu
            this.downloadFromPreview();
            resolve(true);
          }
        },
        error: (error) => {
          console.error('Erreur récupération dataset depuis Firebase :', error);
          // Fallback vers l'aperçu
          this.downloadFromPreview();
          resolve(true);
        }
      });
    });
  }


  private downloadFromPreview() {
    if (!this.dataset || !this.dataPreview.length) {
      // Afficher la modale d'erreur
      this.errorMsg = 'Aucune donnée disponible pour le téléchargement';
      this.showErrorModal = true;
      return;
    }

    try {
      let csvContent = this.dataHeaders.join(',') + '\n';
      
      this.dataPreview.forEach(row => {
        const escapedRow = row.map(cell => {
          if (cell === null || cell === undefined) return '';
          const stringValue = String(cell);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return '"' + stringValue.replace(/"/g, '""') + '"';
          }
          return stringValue;
        });
        csvContent += escapedRow.join(',') + '\n';
      });

      this.downloadFile(csvContent, `${this.dataset.name}.csv`, 'text/csv');
      // Afficher la modale de succès
      this.successMessage = `Aperçu du dataset "${this.dataset.name}" téléchargé avec succès !`;
      this.showSuccessModal = true;
    } catch (error) {
      console.error('Erreur lors du téléchargement de l\'aperçu:', error);
      // Afficher la modale d'erreur
      this.errorMsg = 'Erreur lors de la création du fichier. Veuillez réessayer.';
      this.showErrorModal = true;
    }
  }


  private showLoadingIndicator() {
    // Vous pouvez implémenter un indicateur de chargement ici
    console.log('Téléchargement en cours...');
  }

  private downloadFile(content: string, filename: string, mimeType: string) {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors du téléchargement du fichier:', error);
      throw error;
    }
  }

  private showDownloadSuccess(filename: string) {
    // Notification simple
    const message = `Téléchargement réussi: ${filename}`;
    console.log(message);
    
  }

  deleteDataset() {
    // Afficher la modale de confirmation au lieu de confirm()
    this.showConfirmModal = true;
  }

  onConfirmModalClose(confirmed: boolean) {
    this.showConfirmModal = false;
    
    if (confirmed && this.dataset) {
      // L'utilisateur a confirmé la suppression
      this.dataset.loading = true;

      // Appeler le service pour supprimer le dataset
      this.datasetsService.deleteDataset(this.dataset.id)
        .then(() => {
          console.log('✅ Dataset supprimé avec succès:', this.dataset!.name);
          
          // Supprimer aussi du localStorage si présent
          localStorage.removeItem('dataset');
          
          // Afficher la modale de succès
          this.successMessage = `Dataset "${this.dataset!.name}" supprimé avec succès !`;
          this.showSuccessModal = true;
        })
        .catch((error) => {
          console.error('❌ Erreur lors de la suppression:', error);
          
          // Afficher la modale d'erreur - utilisez errorMsg au lieu de errorMessage
          this.errorMsg = 'Erreur lors de la suppression du dataset. Veuillez réessayer.';
          this.showErrorModal = true;
          
          // Réinitialiser l'indicateur de chargement en cas d'erreur
          if (this.dataset) {
            this.dataset.loading = false;
          }
        });
    }
  }

  onSuccessModalClose() {
    this.showSuccessModal = false;
    // Rediriger vers la liste des datasets
    this.router.navigate(['/datasets']);
  }

  onErrorModalClose() {
    this.showErrorModal = false;
    // L'utilisateur peut rester sur la page pour réessayer
  }


}