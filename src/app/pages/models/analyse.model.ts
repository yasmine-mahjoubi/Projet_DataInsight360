export type AnalyseType ='Statistiques descriptives'| 'Valeurs aberrantes'| 
                            'Corrélation'| 'Histogramme automatique';

export type AnalyseStatus = 'Terminé' | 'En cours' | 'Échec';


export interface Analyse {
    id?: string;
    firestoreId?: string;
    datasetId: string;
    datasetName: string;
    type: AnalyseType;
    status: AnalyseStatus;
    startedAt: Date;
    finishedAt?: Date;
    column1?: string;
    column2?: string;
    result?: any;
}