export class GlobalAuth {
  private static _url?: string;
  private static _token: string;
  private static _exp: number;

  static init(url: string | undefined) {
    this._url = url;
    this._token = '';
    this._exp = 0;
  }

  static get token() {
    return this._token;
  }

  static set token(value: string) {
    this._token = value;
  }

  static get exp() {
    return this._exp;
  }

  static set exp(value: number) {
    this._exp = value;
  }

  static get url() {
    return this._url;
  }
}
