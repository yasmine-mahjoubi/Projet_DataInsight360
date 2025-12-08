import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysesDS } from './analyses';

describe('Analyses', () => {
  let component: AnalysesDS;
  let fixture: ComponentFixture<AnalysesDS>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysesDS]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalysesDS);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});