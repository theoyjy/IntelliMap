import { Routes } from '@angular/router';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { StartPageComponent } from './components/start-page/start-page.component';
import { BehaviorPathComponent } from './components/behavior-path/behavior-path.component';

export const routes: Routes = [
  { path: '', redirectTo: 'start-page', pathMatch: 'full' },
  { path: 'start-page', component: StartPageComponent }, // 启动页面
  { path: 'user-profile', component: UserProfileComponent }, // 问卷页面
  { path: 'behavior-path', component: BehaviorPathComponent } // 画布页面
];
