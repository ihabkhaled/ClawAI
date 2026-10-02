import { isMetadataIp, isNonPublicIp } from '../ip-address.utility';

describe('isNonPublicIp', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '100.127.255.255',
    '0.0.0.0',
    '224.0.0.1',
    '255.255.255.255',
    '198.18.0.1',
    '::1',
    '::',
    'fc00::1',
    'fd00:ec2::254',
    'fe80::1',
    'ff02::1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '0:0:0:0:0:ffff:7f00:1',
    '::ffff:169.254.169.254',
    '::ffff:a9fe:a9fe',
    '::ffff:10.0.0.1',
    '64:ff9b::7f00:1',
    '2002:7f00:1::',
    '[::1]',
  ])('treats %s as non-public', (address) => {
    expect(isNonPublicIp(address)).toBe(true);
  });

  it.each([
    '93.184.216.34',
    '8.8.8.8',
    '100.63.255.255',
    '100.128.0.1',
    '172.15.0.1',
    '172.32.0.1',
    '2606:4700:4700::1111',
    '::ffff:8.8.8.8',
    '::ffff:808:808',
  ])('treats %s as public', (address) => {
    expect(isNonPublicIp(address)).toBe(false);
  });
});

describe('isMetadataIp', () => {
  it.each([
    '169.254.169.254',
    '100.100.100.200',
    'fd00:ec2::254',
    '::ffff:169.254.169.254',
    '::ffff:a9fe:a9fe',
  ])('recognises %s', (address) => {
    expect(isMetadataIp(address)).toBe(true);
  });

  it.each(['10.0.0.1', '8.8.8.8', 'fd00:ec2::255', '::1'])('does not flag %s', (address) => {
    expect(isMetadataIp(address)).toBe(false);
  });
});
