import {AWSType} from "aws-async-type";

export class HostedZone extends AWSType {
  constructor(route53, iddef) {
    super(route53, "Id", iddef);
  }

  static async get(route53, {
    Id,
    ...params
  }={}) {
    params = {Id, ...params};
    const result = await route53.getHostedZone(params);
    return new HostedZone(route53, result.HostedZone);
  }

  static async findByName(route53, name) {
    const DNSName = name.slice(-1) !== "." ? name = `${name}.` : name;

    for await (const zone of route53.listHostedZonesByName({DNSName})) {
      if (zone.Name === DNSName) {
        return new HostedZone(route53, zone);
      } else {
        throw new Error("could not find hosted zone named " + name);
      }
    }
  }

  async A(name, ttl, ...values) {
    await this.record("A", name, ttl, ...values);
  }

  async AAAA(name, ttl, ...values) {
    await this.record("AAAA", name, ttl, ...values);
  }

  async CNAME(name, ttl, ...values) {
    await this.record("CNAME", name, ttl, ...values);
  }

  async record(type, name, ttl, ...values) {
    const [Type, Name, TTL] = [type, `${name}.${this.Name}`, ttl];

    await this.#changeResourceRecordSets([{
      Action: "UPSERT",
      ResourceRecordSet: {
        Type, Name, TTL,
        ResourceRecords: values.map(Value => ({Value}))
      }
    }]);
  }

  async TXT(name, ttl, ...values) {
    await this.record("TXT", name, ttl, ...values.map(v => `\"${v}\"`))
  }

  async #changeResourceRecordSets(changes) {
    this.throwIfUnidentified();
    
    return this.api.changeResourceRecordSets({
      HostedZoneId: this.Id,
      ChangeBatch: {Changes: changes}
    });
  }
}
