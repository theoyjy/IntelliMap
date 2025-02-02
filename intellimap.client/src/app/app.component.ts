import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router'; // 导入 RouterOutlet

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [RouterOutlet], // 显式引入 RouterOutlet
})
export class AppComponent {}
