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
    { text: '当面对风险时，你通常如何反应？', options: ['冷静分析风险', '避免风险', '迎接风险'], answer: '' },
    { text: '你更倾向于逻辑分析还是直觉判断？', options: ['逻辑分析', '直觉判断'], answer: '' },
    { text: '你如何看待变化和不确定性？', options: ['充满机会', '需要控制', '感到焦虑'], answer: '' },
    { text: '在团队中，你更愿意扮演什么角色？', options: ['领导者', '协调者', '执行者'], answer: '' },
    { text: '你是否经常制定详细的计划？', options: ['是的，几乎总是', '偶尔', '从不'], answer: '' },
    { text: '当事情无法按照计划进行时，你如何应对？', options: ['调整计划', '寻找帮助', '感到困惑'], answer: '' },
    { text: '你倾向于从数据中获取信息还是从经验中学习？', options: ['数据中获取', '经验中学习'], answer: '' },
    { text: '当需要做出快速决定时，你会怎么做？', options: ['迅速评估并决定', '依赖直觉', '寻求他人意见'], answer: '' },
    { text: '描述一次你在复杂情况下做出决策的经历。', options: ['信赖自己', '寻求建议', '参考过去经验'], answer: '' },
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

      // 调用后端 API
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

            // 跳转到画布页面，传递默认行为和分析结果
            this.navigateToBehaviorPath(response.data);
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
