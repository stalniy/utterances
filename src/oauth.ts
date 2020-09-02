import { UTTERANCES_API } from './config';

export const token = { value: null as null | string };

// tslint:disable-next-line:variable-name
export function getLoginUrl(url: string) {
  return `${UTTERANCES_API}/authorize?redirect_uri=${encodeURIComponent(url)}`;
}

export async function loadToken(): Promise<string | null> {
  if (token.value) {
    return token.value;
  }
  const url = `${UTTERANCES_API}/token`;
  const response = await fetch(url, { method: 'POST', mode: 'cors', credentials: 'include' });
  if (response.ok) {
    const t = await response.json();
    token.value = t;
    return t;
  }
  return null;
}
