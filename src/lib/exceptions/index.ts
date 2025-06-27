export class ClientError extends Error {
  constructor(message: string) {
    super(`Something went wrong: ${message}`);
    this.name = this.constructor.name;
  }
}

export class RemoteError extends ClientError {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class CheckSwitcherError extends ClientError {
  constructor(notFound: string[]) {
    super(`[${notFound}] not found`);
    this.name = this.constructor.name;
  }
}
