import { withConnectorGatewayHeaders } from '../connector-gateway-headers.utility';

describe('withConnectorGatewayHeaders', () => {
  it('returns the provider headers as-is when the connector has no gateway headers', () => {
    const provider = { Authorization: 'Bearer k' };
    expect(withConnectorGatewayHeaders(provider, undefined)).toBe(provider);
  });

  it('adds gateway headers next to the provider auth', () => {
    expect(
      withConnectorGatewayHeaders(
        { Authorization: 'Bearer k' },
        { 'x-portkey-api-key': 'pk', 'x-portkey-provider': 'anthropic' },
      ),
    ).toEqual({
      Authorization: 'Bearer k',
      'x-portkey-api-key': 'pk',
      'x-portkey-provider': 'anthropic',
    });
  });

  it('lets the provider header win over a gateway header of the same name in any case', () => {
    expect(
      withConnectorGatewayHeaders({ Authorization: 'Bearer real' }, { authorization: 'spoof' }),
    ).toEqual({ Authorization: 'Bearer real' });
  });
});
