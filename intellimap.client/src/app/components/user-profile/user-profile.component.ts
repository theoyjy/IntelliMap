import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatStepperModule, MatButtonModule, MatRadioModule],
})
export class UserProfileComponent implements OnInit {
  userId: string = ''; // 用户 ID
  eventDesc: string = ''; // 从路由获取事件描述
  questions = [
    { text: '你喜欢独自做决定还是倾向于他人建议？', options: ['独自做决定', '倾向于他人建议'], answer: '' },
  ];
  
  aiAnalysisResult: any = null;
  isSubmitting: boolean = false;

  constructor(private router: Router, private route: ActivatedRoute, private apiService: ApiService) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.userId = params['userId'] || '未知用户';
      this.eventDesc = params['eventDesc'] || '未提供事件描述';
      console.log('接收到的用户 ID:', this.userId);
      console.log('接收到的事件描述:', this.eventDesc);
    });
  }

  submitQuestions(): void {
    if (this.isAllQuestionsAnswered()) {
      this.isSubmitting = true;
      const answers = this.questions.map((q) => q.answer);

      const requestBody = {
        userId: this.userId,
        eventDesc: this.eventDesc,
        answer: answers,
      };

      this.apiService.postData('api/firstProfile', requestBody)
        .subscribe(
          (response: any) => {
            this.aiAnalysisResult = response;
            alert('提交成功！建议行为已生成！');
            console.log('AI 分析结果：', this.aiAnalysisResult);
            // 将数据存入 LocalStorage
            localStorage.setItem('aiResult', JSON.stringify(response.data));

            // 跳转到画布页面
            this.router.navigate(['/behavior-path']);
          },
          (error) => {
            console.error('提交失败：', error);
            alert('提交失败，请稍后重试！');
          },
          () => {
            this.isSubmitting = false;
          }
        );
    } else {
      alert('请完成所有问题后再提交！');
    }
  }

  // 跳转到画布页面的方法
  private navigateToBehaviorPath(aiResult: any): void {
    this.router.navigate(['/behavior-path'], {
      state: { aiResult: aiResult },
    });
  }

  // 检查是否所有问题都已回答
  private isAllQuestionsAnswered(): boolean {
    return this.questions.every((q) => q.answer && q.answer.trim() !== '');
  }
}
