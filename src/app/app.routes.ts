import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Datasets } from './pages/datasets/datasets';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { authGuard, adminGuard } from './guards/auth.guard';

export const routes: Routes = [
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
            }
        ]
    },
    
];
