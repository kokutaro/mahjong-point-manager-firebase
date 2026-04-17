import { describe, expect, it } from 'vitest';
import { resolveQrCodeComponent } from './resolveQrCodeComponent';

describe('resolveQrCodeComponent', () => {
  it('returns the component when it already has a render function', () => {
    const component = { render: () => undefined };

    expect(resolveQrCodeComponent(component, component)).toBe(component);
  });

  it('unwraps nested default exports until it finds a renderable component', () => {
    const component = { render: () => undefined };
    const wrapped = {
      default: {
        default: component,
      },
    };

    expect(resolveQrCodeComponent(wrapped, component)).toBe(component);
  });

  it('unwraps nested QRCode exports until it finds a renderable component', () => {
    const component = { render: () => undefined };
    const wrapped = {
      QRCode: {
        default: component,
      },
    };

    expect(resolveQrCodeComponent(wrapped, component)).toBe(component);
  });

  it('falls back when no renderable component is found', () => {
    const fallback = { render: () => undefined };

    expect(resolveQrCodeComponent({ default: { QRCode: {} } }, fallback)).toBe(fallback);
  });
});
