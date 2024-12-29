import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PrintPageRoutingModule } from './print-routing.module';

import { NgxPrintModule } from 'ngx-print';
import { PrintPage } from './print.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NgxPrintModule,
    PrintPageRoutingModule
  ],
  declarations: [PrintPage]
})
export class PrintPageModule {}
