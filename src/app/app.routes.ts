import { Routes } from '@angular/router';
import { AccueilComponent } from './pages/accueil/accueil';
import { Home } from './pages/home/home';
import { Datasets } from './pages/data-scientist/datasets/datasets';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { DatasetDetails } from './pages/data-scientist/dataset-details/dataset-details';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { Themes } from './pages/themes/themes';
import { Users } from './pages/users/users';
import { authGuard, adminGuard, dataScientistGuard } from './guards/auth.guard';
import { HomeDataScientist} from './pages/data-scientist/home/home';
import { DashboardDSComponent } from './pages/data-scientist/dashboard/dashboard';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password';
import { ResetPasswordComponent } from './pages/reset-password/reset-password';
import { AnalysesDS } from './pages/data-scientist/analyses/analyses';
import { AnalysesDetails } from './pages/data-scientist/analyses-details/analyses-details';
import { AnalysesNew } from './pages/data-scientist/analyses-new/analyses-new';

export const routes: Routes = [
    { path: '', component: AccueilComponent },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'forgot-password', component: ForgotPasswordComponent },
    { path: 'reset-password', component: ResetPasswordComponent },
    {
        path: 'home',
        component: Home,
        canActivate: [authGuard],
        children:[
            { 
                path: 'dashboard', 
                component: DashboardComponent,
                canActivate: [adminGuard]
            },
            {
                path: 'themes',
                component: Themes,
                canActivate: [adminGuard]
            },
            {
                path: 'users',
                component: Users,
                canActivate: [adminGuard]
            }

        ]
    },
    {
        path: 'data-scientist',
        component: HomeDataScientist,
        canActivate: [authGuard],
        children:[
            { 
                path: 'dashboard', 
                component: DashboardDSComponent,
                canActivate: [dataScientistGuard]
            },
            {
                path: 'analyses',
                component: AnalysesDS,
                canActivate: [dataScientistGuard]
            },
            {
                path: "analyses/new",
                component : AnalysesNew,
                canActivate: [dataScientistGuard]
            },
            {
                path: "analyses/:id",
                component : AnalysesDetails,
                canActivate: [dataScientistGuard]
            },
            {
                path: 'datasets',
                component: Datasets,
                canActivate: [dataScientistGuard]
            },
            {
                path: 'datasets/:id',
                component: DatasetDetails,
                canActivate: [dataScientistGuard]
            }
        ]
    },
];
