import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../services/api.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';


@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatProgressSpinnerModule,MatDialogModule],
})
export class UserProfileComponent implements OnInit {
  userId: string = ''; // User ID
  eventDesc: string = ''; // Event description from query parameters
  currentIndex: number = 0; // Current question index
  isSubmitting: boolean = false; // Loading state
  userAnswers: string[] = []; // Store user answers
  aiAnalysisResult: any = null; // AI response

  // Questions for user profiling
  questions = [
    { text: 'When making important decisions, what do you prioritize?', options: ['Facts and data', 'Intuition and experience'] },
    { text: 'How do you prefer to interact with others?', options: ['I enjoy solitude', 'I love socializing'] },
    { text: 'How do you handle a brand-new problem?', options: ['Carefully research first', 'Try different approaches first'] },
    { text: 'How do you typically react in high-pressure situations?', options: ['Stay calm and analyze', 'Emotional fluctuations'] },
    { text: 'When facing an uncertain future, you are more likely to?', options: ['Plan multiple backups', 'Adapt on the fly'] },
    { text: 'How do you prefer to work?', options: ['Step by step', 'Multitasking'] },
    { text: 'If you are in a team, what role do you naturally take?', options: ['A leader', 'A team player'] },
    { text: 'When your opinion differs from most people, you tend to?', options: ['Express my view directly', 'Consider others’ perspectives'] },
    { text: 'What is your attitude toward risk?', options: ['Prefer stability', 'Take risks'] },
    { text: 'How do you approach problem-solving?', options: ['Logical reasoning', 'Practical experience'] },
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    // Get query parameters (userId and eventDesc)
    this.route.queryParams.subscribe((params) => {
      this.userId = params['userId'] || 'Unknown User';
      this.eventDesc = params['eventDesc'] || 'No Event Description Provided';
    });
  }

  // Get current question
  get currentQuestion() {
    return this.questions[this.currentIndex];
  }

  // Handle user selecting an answer
  selectAnswer(answer: string): void {
    this.userAnswers.push(answer); // Store answer

    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++; // Move to next question
    } else {
      this.submitAnswers(); // Submit answers when all questions are done
    }
  }

  // Submit answers to the backend
  submitAnswers(): void {
    this.userId = crypto.randomUUID();
    localStorage.setItem("userId", this.userId);
    this.isSubmitting = true; // Show loading spinner
    const requestBody = {
      userId: this.userId,
      eventDesc: this.eventDesc,
      answer: this.userAnswers,
    };

    this.apiService.postData('api/firstProfile', requestBody).subscribe(
      (response: any) => {

        this.aiAnalysisResult = response;
        localStorage.setItem('aiResult', JSON.stringify(response.data));
        this.router.navigate(['/behavior-path'],{queryParams: { userId: this.userId, eventDesc: this.eventDesc }
        });
      },
      (error) => {
        console.error('Submission failed:', error);
        alert('Submission failed, please try again later.');
      },
      () => {
        this.isSubmitting = false; // Hide loading spinner
      }
    );
  }
}
