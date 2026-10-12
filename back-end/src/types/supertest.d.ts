declare module 'supertest' {
  interface Response {
    body: any;
    headers: Record<string, any>;
  }

  interface Test extends Promise<Response> {
    set(field: string, value: string): this;
    send(body?: unknown): this;
    expect(status: number): this;
  }

  interface Agent {
    get(path: string): Test;
    post(path: string): Test;
    patch(path: string): Test;
    del(path: string): Test;
  }

  function request(server: unknown): Agent;
  export = request;
}
