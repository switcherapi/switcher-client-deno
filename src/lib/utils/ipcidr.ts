export default class IPCIDR {
  cidr: string;

  constructor(cidr: string) {
    this.cidr = cidr;
  }

  private ip4ToInt(ip: string) {
    return ip.split('.').reduce((int, oct) => (int << 8) + Number.parseInt(oct, 10), 0) >>> 0;
  }

  isIp4InCidr(ip: string) {
    const [range, bits = 32] = this.cidr.split('/');
    const mask = ~(2 ** (32 - Number(bits)) - 1);
    return (this.ip4ToInt(ip) & mask) === (this.ip4ToInt(range) & mask);
  }
}
