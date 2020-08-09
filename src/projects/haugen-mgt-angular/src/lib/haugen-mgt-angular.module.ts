import { NgModule } from '@angular/core';
import { MsalModule, MsalService } from '@azure/msal-angular';
import { CustomMsalProvider } from './custom-msal-provider';
import { MgtNgPeoplePickerComponent } from './mgt-ng-people-picker.component';
import { MgtNgPersonComponent } from './mgt-ng-person.component';
import { PROVIDER_TOKEN } from './provider-token';

@NgModule({
  declarations: [
    MgtNgPeoplePickerComponent,
    MgtNgPersonComponent
  ],
  imports: [
    MsalModule
  ],
  exports: [
    MgtNgPeoplePickerComponent,
    MgtNgPersonComponent
  ],
  providers: [
    {
      provide: PROVIDER_TOKEN,
      useFactory(msalService: MsalService) {
        return new CustomMsalProvider({
          userAgentApplication: msalService
        });
      },
      deps: [MsalService]
    }
  ]
})
export class HaugenMgtAngularModule { }
