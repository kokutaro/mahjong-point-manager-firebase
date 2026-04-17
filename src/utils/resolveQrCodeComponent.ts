type QrCodeLikeComponent = {
  render?: unknown;
};

const isRenderableQrCodeComponent = (value: unknown): value is QrCodeLikeComponent => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { render?: unknown }).render === 'function'
  );
};

export const resolveQrCodeComponent = <T>(moduleValue: T, fallback: T): T => {
  if (isRenderableQrCodeComponent(moduleValue)) {
    return moduleValue;
  }

  if (typeof moduleValue === 'object' && moduleValue !== null) {
    const record = moduleValue as Record<string, unknown>;

    const fromDefault = resolveQrCodeComponent(record.default, fallback);
    if (fromDefault !== fallback) {
      return fromDefault as T;
    }

    const fromNamed = resolveQrCodeComponent(record.QRCode, fallback);
    if (fromNamed !== fallback) {
      return fromNamed as T;
    }
  }

  return fallback;
};
