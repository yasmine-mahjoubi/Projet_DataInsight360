import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Analyses } from './analyses';

describe('Analyses', () => {
  let component: Analyses;
  let fixture: ComponentFixture<Analyses>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Analyses]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Analyses);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});