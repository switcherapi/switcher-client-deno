export class GlobalAuth {
  private static _token?: string;
  private static _exp?: number;
  private static _url?: string;

  static init(url: string | undefined) {
    this._url = url;
    this._token = undefined;
    this._exp = undefined;
  }

  static get token() {
    return this._token;
  }

  static set token(value: string | undefined) {
    this._token = value;
  }

  static get exp() {
    return this._exp;
  }

  static set exp(value: number | undefined) {
    this._exp = value;
  }

  static get url() {
    return this._url;
  }
}
