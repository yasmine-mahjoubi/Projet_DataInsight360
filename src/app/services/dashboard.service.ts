import { Injectable, inject } from '@angular/core';
import { combineLatest, map, Observable } from 'rxjs';
import { DatasetsService } from './datasets.service';
import { AnalysesService } from './analyses.service';
import { ThemeService } from './theme.service';
import { AuthService } from './auth.service';

export interface DashboardStats {
  totalDatasets: number;
  totalAnalyses: number;
  analysesThisMois: number;
  biggestDataset: any;
  recentActivity: any[];
  analysesByMonth: any[];
  datasetsByTheme: any[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private datasetsService = inject(DatasetsService);
  private analysesService = inject(AnalysesService);
  private themeService = inject(ThemeService);
  private authService = inject(AuthService);

  getDashboardData(): Observable<DashboardStats> {
    return combineLatest([
      this.datasetsService.getAllDatasets(),
      this.analysesService.getStaticAnalyses(), // Utilisez getStaticAnalyses() pour le moment
      this.themeService.getThemes()
    ]).pipe(
      map(([datasets, analyses, themes]) => {
        const currentUser = this.authService.currentUser();
        
        // Filtrer par utilisateur si nécessaire
        // const userDatasets = datasets.filter(d => d.userId === currentUser?.uid);
        // const userAnalyses = analyses.filter(a => a.userId === currentUser?.uid);
        
        // Pour la démo, on utilise toutes les données
        const userDatasets = datasets;
        const userAnalyses = analyses;

        // Total datasets
        const totalDatasets = userDatasets.length;

        // Total analyses
        const totalAnalyses = userAnalyses.length;

        // Analyses ce mois
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const analysesThisMois = userAnalyses.filter(a => {
          const date = a.dateCreation instanceof Date ? a.dateCreation : new Date(a.dateCreation);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).length;

        // Dataset le plus volumineux (simulé avec nombre de lignes)
        const biggestDataset = userDatasets.length > 0 
          ? userDatasets.reduce((max, d) => (d.nombreLignes || 0) > (max.nombreLignes || 0) ? d : max, userDatasets[0])
          : null;

        // Activité récente (5 dernières analyses)
        const recentActivity = userAnalyses
          .sort((a, b) => {
            const dateA = a.dateCreation instanceof Date ? a.dateCreation : new Date(a.dateCreation);
            const dateB = b.dateCreation instanceof Date ? b.dateCreation : new Date(b.dateCreation);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 5);

        // Analyses par mois (6 derniers mois)
        const analysesByMonth = this.getAnalysesByMonth(userAnalyses);

        // Datasets par thème
        const datasetsByTheme = this.getDatasetsByTheme(userDatasets, themes);

        return {
          totalDatasets,
          totalAnalyses,
          analysesThisMois,
          biggestDataset,
          recentActivity,
          analysesByMonth,
          datasetsByTheme
        };
      })
    );
  }

  private getAnalysesByMonth(analyses: any[]): any[] {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const currentDate = new Date();
    const result = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = months[date.getMonth()];
      const count = analyses.filter(a => {
        const aDate = a.dateCreation instanceof Date ? a.dateCreation : new Date(a.dateCreation);
        return aDate.getMonth() === date.getMonth() && aDate.getFullYear() === date.getFullYear();
      }).length;
      
      result.push({ month: monthName, count });
    }

    return result;
  }

  private getDatasetsByTheme(datasets: any[], themes: any[]): any[] {
    const themeCounts: { [key: string]: number } = {};
    
    datasets.forEach(d => {
      const themeName = d.theme || 'Non classé';
      themeCounts[themeName] = (themeCounts[themeName] || 0) + 1;
    });

    return Object.entries(themeCounts).map(([name, count]) => ({
      name,
      count
    }));
  }
}