import { Component, OnInit, Input } from '@angular/core';
import { UnitResultData } from '@resgrid/ngx-resgridlib';

@Component({
  selector: 'app-home-unit-card',
  templateUrl: './unit-card.component.html',
  styleUrls: ['./unit-card.component.scss'],
})
export class UnitCardComponent implements OnInit {

  @Input() unit: UnitResultData;
  @Input() color: string;

  constructor() { }

  ngOnInit() {}

}
