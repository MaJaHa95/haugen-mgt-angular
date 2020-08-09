import { LoginType, ProviderState, SimpleProvider } from '@microsoft/mgt';
import { AuthenticationProviderOptions } from '@microsoft/microsoft-graph-client/lib/es/IAuthenticationProviderOptions';
import { AuthenticationParameters, AuthError, AuthResponse, UserAgentApplication } from 'msal';

export class CustomMsalProvider extends SimpleProvider {
  /**
   * authentication parameter
   *
   * @type {string[]}
   * @memberof MsalProvider
   */
  public scopes: string[];

  private loginType: LoginType;
  private loginHint: string;

  // session storage
  private readonly sessionStorageRequestedScopesKey = 'mgt-requested-scopes';
  private readonly sessionStorageDeniedScopesKey = 'mgt-denied-scopes';
  private readonly msalService: UserAgentApplication;

  constructor(config: { userAgentApplication: UserAgentApplication }) {
    super(s => this.getAccessTokenForScopes(...s), async () => this.login(), async () => this.logout());
    this.msalService = config.userAgentApplication;
    this.scopes = ["user.read"];
    this.loginType = LoginType.Redirect;

    this.msalService.handleRedirectCallback(
        response => this.tokenReceivedCallback(response),
        (error, state) => this.errorReceivedCallback(error, state)
      );

    this.trySilentSignIn();
  }

  /**
   * attempts to sign in user silently
   *
   * @returns
   * @memberof MsalProvider
   */
  public async trySilentSignIn() {
    try {
      if (this.msalService.isCallback(window.location.hash)) {
        return;
      }
      if (this.msalService.getAccount() && (await this.getAccessToken(null))) {
        this.setState(ProviderState.SignedIn);
      } else {
        this.setState(ProviderState.SignedOut);
      }
    } catch (e) {
      this.setState(ProviderState.SignedOut);
    }
  }

  /**
   * sign in user
   *
   * @param {AuthenticationParameters} [authenticationParameters]
   * @returns {Promise<void>}
   * @memberof MsalProvider
   */
  public async login(authenticationParameters?: AuthenticationParameters): Promise<void> {
    const loginRequest: AuthenticationParameters = authenticationParameters || {
      loginHint: this.loginHint,
      prompt: 'select_account',
      scopes: this.scopes
    };

    if (this.loginType === LoginType.Popup) {
      const response = await this.msalService.loginPopup(loginRequest);
      this.setState(response.account ? ProviderState.SignedIn : ProviderState.SignedOut);
    } else {
      this.msalService.loginRedirect(loginRequest);
    }
  }

  /**
   * sign out user
   *
   * @returns {Promise<void>}
   * @memberof MsalProvider
   */
  public async logout(): Promise<void> {
    this.msalService.logout();
    this.setState(ProviderState.SignedOut);
  }

  /**
   * returns an access token for scopes
   *
   * @param {AuthenticationProviderOptions} options
   * @returns {Promise<string>}
   * @memberof MsalProvider
   */
  public async getAccessToken(options: AuthenticationProviderOptions): Promise<string> {
    const scopes = options ? options.scopes || this.scopes : this.scopes;
    const accessTokenRequest: AuthenticationParameters = {
      loginHint: this.loginHint,
      scopes
    };
    try {
      const response = await this.msalService.acquireTokenSilent(accessTokenRequest);
      return response.accessToken;
    } catch (e) {
      if (this.requiresInteraction(e)) {
        if (this.loginType === LoginType.Redirect) {
          // check if the user denied the scope before
          if (!this.areScopesDenied(scopes)) {
            this.setRequestedScopes(scopes);
            this.msalService.acquireTokenRedirect(accessTokenRequest);
          } else {
            throw e;
          }
        } else {
          try {
            const response = await this.msalService.acquireTokenPopup(accessTokenRequest);
            return response.accessToken;
          } catch (e) {
            throw e;
          }
        }
      } else {
        // if we don't know what the error is, just ask the user to sign in again
        this.setState(ProviderState.SignedOut);
        throw e;
      }
    }
    throw null;
  }

  /**
   * sets scopes
   *
   * @param {string[]} scopes
   * @memberof MsalProvider
   */
  public updateScopes(scopes: string[]) {
    this.scopes = scopes;
  }

  /**
   * checks if error indicates a user interaction is required
   *
   * @protected
   * @param {*} error
   * @returns
   * @memberof MsalProvider
   */
  protected requiresInteraction(error?: { errorCode?: string; }) {
    if (!error || !error.errorCode) {
      return false;
    }
    return (
      error.errorCode.indexOf('consent_required') !== -1 ||
      error.errorCode.indexOf('interaction_required') !== -1 ||
      error.errorCode.indexOf('login_required') !== -1
    );
  }

  /**
   * setting scopes in sessionStorage
   *
   * @protected
   * @param {string[]} scopes
   * @memberof MsalProvider
   */
  protected setRequestedScopes(scopes: string[]) {
    if (scopes) {
      sessionStorage.setItem(this.sessionStorageRequestedScopesKey, JSON.stringify(scopes));
    }
  }

  /**
   * getting scopes from sessionStorage if they exist
   *
   * @protected
   * @returns
   * @memberof MsalProvider
   */
  protected getRequestedScopes() {
    const scopesStr = sessionStorage.getItem(this.sessionStorageRequestedScopesKey);
    return scopesStr ? JSON.parse(scopesStr) : null;
  }
  /**
   * clears requested scopes from sessionStorage
   *
   * @protected
   * @memberof MsalProvider
   */
  protected clearRequestedScopes() {
    sessionStorage.removeItem(this.sessionStorageRequestedScopesKey);
  }
  /**
   * sets Denied scopes to sessionStoage
   *
   * @protected
   * @param {string[]} scopes
   * @memberof MsalProvider
   */
  protected addDeniedScopes(scopes: string[]) {
    if (scopes) {
      let deniedScopes: string[] = this.getDeniedScopes() || [];
      deniedScopes = deniedScopes.concat(scopes);

      let index = deniedScopes.indexOf('openid');
      if (index !== -1) {
        deniedScopes.splice(index, 1);
      }

      index = deniedScopes.indexOf('profile');
      if (index !== -1) {
        deniedScopes.splice(index, 1);
      }
      sessionStorage.setItem(this.sessionStorageDeniedScopesKey, JSON.stringify(deniedScopes));
    }
  }

  /**
   * gets deniedScopes from sessionStorage
   *
   * @protected
   * @returns
   * @memberof MsalProvider
   */
  protected getDeniedScopes() {
    const scopesStr = sessionStorage.getItem(this.sessionStorageDeniedScopesKey);
    return scopesStr ? JSON.parse(scopesStr) : null;
  }

  /**
   * if scopes are denied
   *
   * @protected
   * @param {string[]} scopes
   * @returns
   * @memberof MsalProvider
   */
  protected areScopesDenied(scopes: string[]) {
    if (scopes) {
      const deniedScopes = this.getDeniedScopes();
      if (deniedScopes && deniedScopes.filter(s => -1 !== scopes.indexOf(s)).length > 0) {
        return true;
      }
    }

    return false;
  }

  private tokenReceivedCallback(response: AuthResponse) {
    if (response.tokenType === 'id_token') {
      this.setState(ProviderState.SignedIn);
    }

    this.clearRequestedScopes();
  }

  private errorReceivedCallback(authError: AuthError, accountState: string) {
    const requestedScopes = this.getRequestedScopes();
    if (requestedScopes) {
      this.addDeniedScopes(requestedScopes);
    }

    this.clearRequestedScopes();
  }
}
