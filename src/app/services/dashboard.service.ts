import { Injectable, inject } from '@angular/core';
import { combineLatest, map, Observable } from 'rxjs';
import { DatasetsService } from './datasets.service';
import { AnalysesService } from './analyses.service';
import { ThemeService } from './theme.service';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { Analyse } from '../pages/models/analyse.model';

export interface DashboardStats {
  totalDatasets: number;
  totalAnalyses: number;
  analysesThisMois: number;
  biggestDataset: any;
  recentActivity: Analyse[];
  analysesByMonth: { month: string; count: number }[];
  datasetsByTheme: { name: string; count: number }[];
  totalUsers: number;
  totalThemes: number;
  usersByMonth: { month: string; count: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private datasetsService = inject(DatasetsService);
  private analysesService = inject(AnalysesService);
  private themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private usersService = inject(UsersService);

  getDashboardData(): Observable<DashboardStats> {
    return combineLatest([
      this.datasetsService.getAllDatasets(),
      this.analysesService.getAllAnalyses(),
      this.themeService.getThemes(),
      this.usersService.getUsers()
    ]).pipe(
      map(([datasets, analyses, themes, users]) => {
        const currentUser = this.authService.currentUser();
        
        // Filtrer par utilisateur si nécessaire
        // const userDatasets = datasets.filter(d => d.userId === currentUser?.uid);
        // const userAnalyses = analyses.filter(a => a.userId === currentUser?.uid);
        
        // Pour la démo, on utilise toutes les données
        const userDatasets = datasets || [];
        const userAnalyses = analyses || [];
        const allUsers = users || [];
        const allThemes = themes || [];

        // Total datasets
        const totalDatasets = userDatasets.length;

        // Total analyses
        const totalAnalyses = userAnalyses.length;

        // Total utilisateurs
        const totalUsers = allUsers.length;

        // Total thèmes
        const totalThemes = allThemes.length;

        // Analyses ce mois
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const analysesThisMois = userAnalyses.filter((a: Analyse) => {
          const date = a.startedAt instanceof Date ? a.startedAt : new Date(a.startedAt);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).length;

        // Dataset le plus volumineux (simulé avec nombre de lignes)
        const biggestDataset = userDatasets.length > 0 
          ? userDatasets.reduce((max: any, d: any) => {
              const maxLines = max.nombreLignes || 0;
              const dLines = d.nombreLignes || 0;
              return dLines > maxLines ? d : max;
            }, userDatasets[0])
          : null;

        // Activité récente (5 dernières analyses)
        const recentActivity = userAnalyses
          .sort((a: Analyse, b: Analyse) => {
            const dateA = a.startedAt instanceof Date ? a.startedAt : new Date(a.startedAt);
            const dateB = b.startedAt instanceof Date ? b.startedAt : new Date(b.startedAt);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 5);

        // Analyses par mois (6 derniers mois)
        const analysesByMonth = this.getAnalysesByMonth(userAnalyses);

        // Utilisateurs par mois (données statiques avec augmentation)
        const usersByMonth = this.getStaticUsersByMonth();

        // Datasets par thème
        const datasetsByTheme = this.getDatasetsByTheme(userDatasets, themes);

        return {
          totalDatasets,
          totalAnalyses,
          analysesThisMois,
          biggestDataset,
          recentActivity,
          analysesByMonth,
          datasetsByTheme,
          totalUsers,
          totalThemes,
          usersByMonth
        };
      })
    );
  }

  private getAnalysesByMonth(analyses: Analyse[]): { month: string; count: number }[] {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const currentDate = new Date();
    const result: { month: string; count: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = months[date.getMonth()];
      const count = analyses.filter((a: Analyse) => {
        const aDate = a.startedAt instanceof Date ? a.startedAt : new Date(a.startedAt);
        return aDate.getMonth() === date.getMonth() && aDate.getFullYear() === date.getFullYear();
      }).length;
      
      result.push({ month: monthName, count });
    }

    return result;
  }

  private getStaticUsersByMonth(): { month: string; count: number }[] {
    // Données statiques avec augmentation progressive
    // Juillet à Décembre 2024
    return [
      { month: 'Jul', count: 1 },
      { month: 'Aoû', count: 1 },
      { month: 'Sep', count: 1 },
      { month: 'Oct', count: 1 },
      { month: 'Nov', count: 2 },
      { month: 'Déc', count: 6 }
    ];
  }

  private getDatasetsByTheme(datasets: any[], themes: any[]): { name: string; count: number }[] {
    const themeCounts: { [key: string]: number } = {};
    
    datasets.forEach((d: any) => {
      const themeName = d.theme || 'Non classé';
      themeCounts[themeName] = (themeCounts[themeName] || 0) + 1;
    });

    return Object.entries(themeCounts).map(([name, count]) => ({
      name,
      count: count as number
    }));
  }
}