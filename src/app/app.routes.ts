import { Routes } from '@angular/router';
import { AccueilComponent } from './pages/accueil/accueil';
import { Home } from './pages/home/home';
import { Datasets } from './pages/datasets/datasets';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { DatasetDetails } from './pages/dataset-details/dataset-details';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { Themes } from './pages/themes/themes';
import { Users } from './pages/users/users';
import { authGuard, adminGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: '', component: AccueilComponent },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    {
        path: 'home',
        component: Home,
        canActivate: [authGuard],
        children:[
            {
                path: 'datasets',
                component: Datasets
            },
            {
                path: 'datasets/:id',
                component: DatasetDetails
            },
            { 
                path: 'dashboard', 
                component: DashboardComponent,
            },
            {
                path: 'themes',
                component: Themes
            },
            {
                path: 'users',
                component: Users
            }
        ]
    },
];
