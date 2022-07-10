export default class IPCIDR {
  cidr: string;

  constructor(cidr: string) {
    this.cidr = cidr;
  }

  contains(ipAddr: string) {
    const [networkAddr, subnetMask] = this.cidr.split('/');
    return (this.addrToNumber(ipAddr) & this.subnetMaskToNumber(subnetMask)) ==
      this.addrToNumber(networkAddr);
  }

  private addrToNumber(addr: string): number {
    return addr.split('.').reduce(
      (acc, cur, i) => acc += Number(cur) << ((3 - i) * 8),
      0,
    );
  }

  private subnetMaskToNumber(mask: string): number {
    return (0xffffffff << (32 - Number(mask))) & 0xffffffff;
  }
}
