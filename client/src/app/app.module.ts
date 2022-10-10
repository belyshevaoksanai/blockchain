import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BlockComponent } from './block/block.component';
import { TransactionFormComponent } from './transaction-form/transaction-form.component';

@NgModule({
  declarations: [
    AppComponent,
    BlockComponent,
    TransactionFormComponent,
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
