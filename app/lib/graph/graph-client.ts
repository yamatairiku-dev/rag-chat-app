// app/lib/graph/graph-client.ts
import { Client } from '@microsoft/microsoft-graph-client';

/**
 * Graph APIクライアント作成
 */
export function createGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

