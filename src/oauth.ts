import { UTTERANCES_API } from './config';

export const token = { value: null as null | string };

// tslint:disable-next-line:variable-name
export function getLoginUrl(url: string) {
  return `${UTTERANCES_API}/authorize?redirect_uri=${encodeURIComponent(url)}`;
}

export function loadToken(): Promise<string | null> {
  if (token.value) {
    return Promise.resolve(token.value);
  }

  const url = `${UTTERANCES_API}/token`;
  return fetch(url, { method: 'POST', mode: 'cors', credentials: 'include' })
    .then((response) => {
      if (!response.ok) {
        return null;
      }

      return response.json();
    })
    .then((value) => {
      token.value = value;
      return value;
    })
}
