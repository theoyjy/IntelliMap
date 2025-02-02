import { Component } from '@angular/core';

@Component({
  selector: 'app-dialog-info',
  template: `
    <h1 mat-dialog-title>Welcome to IntelliMap Decision</h1>
    <div mat-dialog-content>
      <p>You will answer 10 questions to help the AI analyze your behavior and preferences.</p>
    </div>
    <div mat-dialog-actions>
      <button mat-button mat-dialog-close>Got it!</button>
    </div>
  `,
})
export class DialogInfoComponent {}
