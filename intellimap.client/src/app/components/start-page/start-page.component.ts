import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms'; // 支持 [(ngModel)]
import { MatFormFieldModule } from '@angular/material/form-field'; // 支持 <mat-form-field>
import { MatInputModule } from '@angular/material/input'; // 支持 <input matInput>
import { MatButtonModule } from '@angular/material/button'; // 支持按钮

@Component({
  selector: 'app-start-page',
  templateUrl: './start-page.component.html',
  styleUrls: ['./start-page.component.css'],
  standalone: true,
  imports: [
    FormsModule, // 支持 [(ngModel)]
    MatFormFieldModule, // 支持 <mat-form-field>
    MatInputModule, // 支持 <input matInput>
    MatButtonModule, // 支持按钮
  ],
})
export class StartPageComponent {
  eventDesc: string = ''; // 用户输入的描述问题
  userId: string = ''; // 用户 ID

  constructor(private router: Router) {}



  // 跳转到问卷页面
  navigateToQuestionnaire() {
    if (this.eventDesc.trim()) {
      // 跳转到问卷页面，并传递事件描述和用户 ID
      this.router.navigate(['/user-profile'], {
        queryParams: { eventDesc: this.eventDesc, userId: this.userId },
      });
    } else {
      alert('Please describe your concern before proceeding.');
    }
  }
}
