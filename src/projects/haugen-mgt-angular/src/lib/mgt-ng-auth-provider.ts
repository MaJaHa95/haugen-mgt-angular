import { Injectable } from '@angular/core';
import { BroadcastService, MsalService } from '@azure/msal-angular';
import { IProvider, Providers, ProviderState } from '@microsoft/mgt';
import { createFromProvider } from '@microsoft/mgt/dist/es6/Graph';
import { AuthenticationProviderOptions } from '@microsoft/microsoft-graph-client';

@Injectable({
    providedIn: 'root'
})
export class MgtMsalAngularProvider extends IProvider {
    constructor(
        private broadcastService: BroadcastService,
        private readonly msalService: MsalService
    ) {
        super();
        this.graph = createFromProvider(this);

        this.refreshState();

        this.broadcastService.subscribe('msal:loginSuccess', () => {
            this.refreshState();
        });
    }

    registerAsDefault() {
        Providers.globalProvider = this;
    }

    async getAccessToken(options?: AuthenticationProviderOptions) {
        try {
            const ret = await this.msalService.acquireTokenSilent({
                scopes: options?.scopes
            });

            return ret.accessToken;
        }
        catch (error) {
            if (requiresInteraction(error.errorCode)) {
                let redirectUri = this.msalService.getCurrentConfiguration().auth.redirectUri;

                if (typeof(redirectUri) === 'function') {
                    redirectUri = redirectUri();
                }

                this.msalService.acquireTokenRedirect({
                    scopes: options?.scopes,
                    redirectUri,
                    account: this.msalService.getAccount()
                });

                return undefined as any;
            }
            else{
                throw error;
            }
        }
    }

    private refreshState() {
        if (this.msalService.getLoginInProgress()) {
            this.setState(ProviderState.Loading);
        }
        else if (this.msalService.getAccount()) {
            this.setState(ProviderState.SignedIn);
        }
        else {
            this.setState(ProviderState.SignedOut);
        }
    }
}

function requiresInteraction(errorCode?: string) {
    if (!errorCode || !errorCode.length) {
        return false;
    }

    return errorCode === 'consent_required' ||
        errorCode === 'interaction_required' ||
        errorCode === 'login_required';
}
