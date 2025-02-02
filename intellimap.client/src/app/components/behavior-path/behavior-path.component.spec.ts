import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BehaviorPathComponent } from './behavior-path.component';

describe('BehaviorPathComponent', () => {
  let component: BehaviorPathComponent;
  let fixture: ComponentFixture<BehaviorPathComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BehaviorPathComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BehaviorPathComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
