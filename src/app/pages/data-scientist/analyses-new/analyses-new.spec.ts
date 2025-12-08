import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysesNew } from './analyses-new';

describe('AnalysesNew', () => {
  let component: AnalysesNew;
  let fixture: ComponentFixture<AnalysesNew>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysesNew]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalysesNew);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});