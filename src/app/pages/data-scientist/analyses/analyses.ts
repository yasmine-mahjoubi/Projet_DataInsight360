import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AnalysesService } from '../../../services/analyses.service';
import { Analyse } from '../../models/analyse.model';
import { Timestamp } from 'firebase/firestore';

@Component({
  selector: 'app-analyses',
  imports: [CommonModule],
  templateUrl: './analyses.html',
  styleUrl: './analyses.css',
})
export class AnalysesDS {

  private router = inject(Router);
  private analysesService = inject(AnalysesService);

  // === Signals ===
  analyses = signal<Analyse[]>([]);
  selectedDataset = signal<string>('');
  sortOrder = signal<'date-desc' | 'date-asc'>('date-desc');

  // === Pagination ===
  page = signal(1);
  pageSize = 5;
  nextPage() {
  this.page.update(p => p + 1);
}

  prevPage() {
  this.page.update(p => p - 1);
}

  // Charger analyses au démarrage
    ngOnInit() {
    this.analysesService.getAllAnalyses().subscribe(list => {
      // Convertir Firebase Timestamp en Date
      const converted = list.map(a => ({
        ...a,
        startedAt: a.startedAt instanceof Timestamp ? a.startedAt.toDate() : new Date(a.startedAt)
      }));
      this.analyses.set(converted);
    });
  }

  // === Filtrer + Trier ===
  filteredAnalyses = computed(() => {
    let result = [...this.analyses()];

    // Filtre dataset
    if (this.selectedDataset()) {
      result = result.filter(a => a.datasetId === this.selectedDataset());
    }

    // Tri
    result = result.sort((a, b) => {
      const da = new Date(a.startedAt).getTime();
      const db = new Date(b.startedAt).getTime();

      return this.sortOrder() === 'date-desc' ? db - da : da - db;
    });

    return result;
  });

  // === Pagination (simple) ===
  paginatedAnalyses = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredAnalyses().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this.filteredAnalyses().length / this.pageSize));
  // Liste unique des datasets pour le filtre
  datasetOptions = computed(() => {
  const unique: { id: string, name: string }[] = [];
  const ids = new Set<string>();

  for (let a of this.analyses()) {
    if (!ids.has(a.datasetId)) {
      ids.add(a.datasetId);
      unique.push({ id: a.datasetId, name: a.datasetName });
    }
  }
  return unique;
});

  

  // === Navigation ===
  createNewAnalyse() {
    this.router.navigate(['data-scientist/analyses/new']);
  }

  openDetails(datasetId: string) {
    // Naviguer vers la page analyses-details du dataset
    this.router.navigate(['data-scientist/analyses', datasetId]);
  }
  deleteAnalyse(id: string) {
  // Récupérer l'analyse dans le service au lieu du composant
  const analyse = this.analysesService.getAllAnalyses().subscribe(list => {
    const target = list.find(a => a.id === id);
    if (!target) return;

    // Supprimer de Firebase si nécessaire
    if (target.id) {
      this.analysesService.deleteAnalyse(target.id);
    }


    // notifier l'utilisateur via toast stylée
    this.showNotification(`Analyse supprimée avec succès.`, 'success');
  });
}

  // === Notifications (toast) ===
  notification = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  showNotification(message: string, type: 'success' | 'error' = 'success', duration = 3500) {
    this.notification.set({ message, type });
    // auto-hide
    setTimeout(() => this.notification.set(null), duration);
  }

  clearNotification() {
    this.notification.set(null);
  }

}