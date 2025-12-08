import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysesDetails } from './analyses-details';

describe('AnalysesDetails', () => {
  let component: AnalysesDetails;
  let fixture: ComponentFixture<AnalysesDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysesDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalysesDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});