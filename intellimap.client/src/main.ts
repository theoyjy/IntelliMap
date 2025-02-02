import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { provideAnimations } from '@angular/platform-browser/animations'; // 替换 provideAnimationsAsync
import { provideHttpClient } from '@angular/common/http'; // 添加 HttpClient 支持

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes), // 提供路由
    provideAnimations(), // 提供动画支持
    provideHttpClient(), // 提供 HttpClient 支持
  ],
}).catch((err) => console.error(err));
