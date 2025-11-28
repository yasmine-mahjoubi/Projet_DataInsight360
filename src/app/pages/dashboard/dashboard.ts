import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardService, DashboardStats } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
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
    const labels: { [key: string]: string } = {
      'descriptive': 'Statistiques descriptives',
      'correlation': 'Analyse de corrélation',
      'anomalies': 'Détection d\'anomalies',
      'histogramme': 'Histogramme'
    };
    return labels[type] || type;
  }

  formatDate(date: any): string {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Aujourd'hui";
    if (days === 1) return "Hier";
    if (days < 7) return `Il y a ${days} jours`;
    if (days < 30) return `Il y a ${Math.floor(days / 7)} semaines`;
    return d.toLocaleDateString('fr-FR');
  }

  getMaxValue(data: any[]): number {
    return Math.max(...data.map(d => d.count), 1);
  }

  getBarHeight(value: number, max: number): string {
    return `${(value / max) * 100}%`;
  }
}