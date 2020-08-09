import { InjectionToken } from '@angular/core';
import { IProvider } from '@microsoft/mgt';

export const PROVIDER_TOKEN = new InjectionToken<IProvider>('mgt provider');
