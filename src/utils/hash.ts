export const hashPasscode = async (passcode: string, salt: string = ''): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + passcode);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};
