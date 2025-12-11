import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardService, DashboardStats } from '../../../services/dashboard.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardDSComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);

  dashboardData: DashboardStats | null = null;
  loading = true;
  error = '';

  // Couleurs pour les graphiques
  colors = ['#42a5f5', '#66bb6a', '#ffa726', '#ef5350', '#ab47bc', '#26c6da'];

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading = true;
    this.error = '';
    
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        this.dashboardData = data;
        this.loading = false;
        console.log('Dashboard data:', data);
      },
      error: (error) => {
        console.error('Erreur chargement dashboard:', error);
        this.error = 'Erreur lors du chargement des données';
        this.loading = false;
      }
    });
  }

  get userProfile() {
    return this.authService.getUserProfile();
  }

  getStatusColor(status: string): string {
    switch(status) {
      case 'Terminé': return '#66bb6a';
      case 'En cours': return '#ffa726';
      case 'Échec': return '#ef5350';
      default: return '#94a3b8';
    }
  }

  getAnalyseTypeLabel(type: string): string {
    return type; // Le type est déjà en français dans le modèle
  }

  formatDate(date: any): string {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Aujourd'hui";
    if (days === 1) return "Hier";
    if (days < 7) return `Il y a ${days} jours`;
    if (days < 30) return `Il y a ${Math.floor(days / 7)} semaine${Math.floor(days / 7) > 1 ? 's' : ''}`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getMaxValue(data: any[]): number {
    return Math.max(...data.map(d => d.count), 1);
  }

  getBarHeight(value: number, max: number): string {
    return `${(value / max) * 100}%`;
  }

  // Calculer le pourcentage pour le pie chart
  getPercentage(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  // Obtenir le total des datasets
  getTotalDatasetCount(): number {
    if (!this.dashboardData) return 0;
    return this.dashboardData.datasetsByTheme.reduce((sum, item) => sum + item.count, 0);
  }
  // Méthodes pour l'area chart
getLinePath(data: any[]): string {
  if (data.length === 0) return '';
  const max = this.getMaxValue(data);
  const points = data.map((item, index) => {
    const x = this.getPointX(index, data.length);
    const y = this.getPointY(item.count, max);
    return `${x},${y}`;
  });
  return `M ${points.join(' L ')}`;
}

getAreaPath(data: any[]): string {
  if (data.length === 0) return '';
  const max = this.getMaxValue(data);
  const points = data.map((item, index) => {
    const x = this.getPointX(index, data.length);
    const y = this.getPointY(item.count, max);
    return `${x},${y}`;
  });
  const firstX = this.getPointX(0, data.length);
  const lastX = this.getPointX(data.length - 1, data.length);
  return `M ${firstX},200 L ${points.join(' L ')} L ${lastX},200 Z`;
}

getPointX(index: number, total: number): number {
  const width = 600;
  const padding = 50;
  const availableWidth = width - (padding * 2);
  return padding + (index / (total - 1)) * availableWidth;
}

getPointY(value: number, max: number): number {
  const height = 200;
  const padding = 20;
  const availableHeight = height - (padding * 2);
  return height - padding - ((value / max) * availableHeight);
}

// Méthodes pour le pie chart
getPieSegment(value: number, total: number): string {
  const circumference = 2 * Math.PI * 80;
  const percentage = total > 0 ? (value / total) : 0;
  const segmentLength = circumference * percentage;
  return `${segmentLength} ${circumference}`;
}

getPieOffset(index: number): number {
  if (!this.dashboardData) return 0;
  const circumference = 2 * Math.PI * 80;
  const total = this.getTotalDatasetCount();
  let offset = 0;
  
  for (let i = 0; i < index; i++) {
    const item = this.dashboardData.datasetsByTheme[i];
    const percentage = total > 0 ? (item.count / total) : 0;
    offset += circumference * percentage;
  }
  
  return -offset;
}

// Méthodes pour l'histogramme des statuts
getStatusCount(status: string): number {
  if (!this.dashboardData) return 0;
  return this.dashboardData.recentActivity.filter(a => a.status === status).length;
}

getStatusBarHeight(status: string): string {
  const count = this.getStatusCount(status);
  const max = Math.max(
    this.getStatusCount('Terminé'),
    this.getStatusCount('En cours'),
    this.getStatusCount('Échec'),
    1
  );
  return `${(count / max) * 100}%`;
}
}