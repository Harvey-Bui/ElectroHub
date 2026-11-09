import { CUSTOMER_CREATE, CUSTOMER_DELETE, CUSTOMER_UPDATE, runScript } from '../db/scripts.js';
import { HttpError } from '../lib/httpError.js';
import {
  customerInputSchema,
  customerUpdateSchema,
  type Address,
  type Customer,
  type CustomerInput,
  type CustomerUpdate,
} from '../schemas/customer.js';
import { formatSequenceId, isEmptyHash, type RepositoryContext } from './context.js';

function toHashPairs(customer: Customer): string[] {
  return [
    'id', customer.id,
    'email', customer.email,
    'name', customer.name,
    'phone', customer.phone ?? '',
    'address', customer.address ? JSON.stringify(customer.address) : '',
    'createdAt', customer.createdAt,
    'updatedAt', customer.updatedAt,
  ]; // prettier-ignore
}

function fromHash(hash: Record<string, string>): Customer {
  return {
    id: hash.id!,
    email: hash.email!,
    name: hash.name!,
    phone: hash.phone || null,
    address: hash.address ? (JSON.parse(hash.address) as Address) : null,
    createdAt: hash.createdAt!,
    updatedAt: hash.updatedAt!,
  };
}

/**
 * Customer profiles (`customer:{id}` hashes) with a unique email lookup
 * (`customer:email:{email}` strings). Ids come from the `counter:customer` sequence.
 */
export class CustomerRepository {
  constructor(private readonly ctx: RepositoryContext) {}

  private get client() {
    return this.ctx.client;
  }

  private get keys() {
    return this.ctx.keys;
  }

  /** Creates a customer. Throws 409 if the email is already registered. */
  async create(input: CustomerInput): Promise<Customer> {
    const data = customerInputSchema.parse(input);
    const id = formatSequenceId('cus', await this.client.incr(this.keys.counterCustomer()));
    const now = new Date().toISOString();
    const customer: Customer = {
      id,
      email: data.email,
      name: data.name,
      phone: data.phone ?? null,
      address: data.address ?? null,
      createdAt: now,
      updatedAt: now,
    };

    const created = await runScript(this.client, CUSTOMER_CREATE, [
      this.keys.prefix,
      id,
      customer.email,
      ...toHashPairs(customer),
    ]);
    if (created !== 1) throw HttpError.conflict(`Email "${customer.email}" is already registered`);
    return customer;
  }

  async findById(id: string): Promise<Customer | null> {
    const hash = await this.client.hGetAll(this.keys.customer(id));
    return isEmptyHash(hash) ? null : fromHash(hash);
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const id = await this.client.get(this.keys.customerEmail(email.trim()));
    return id ? this.findById(id) : null;
  }

  /** Partial update. Changing the email re-points the unique lookup atomically. */
  async update(id: string, patch: CustomerUpdate): Promise<Customer | null> {
    const changes = customerUpdateSchema.parse(patch);
    const current = await this.findById(id);
    if (!current) return null;

    const next: Customer = {
      ...current,
      ...Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined)),
      updatedAt: new Date().toISOString(),
    };
    const result = Number(
      await runScript(this.client, CUSTOMER_UPDATE, [
        this.keys.prefix,
        id,
        next.email !== current.email ? next.email : '',
        ...toHashPairs(next),
      ]),
    );
    if (result === -1) return null;
    if (result === 0) throw HttpError.conflict(`Email "${next.email}" is already registered`);
    return next;
  }

  /** Deletes profile, email lookup and cart. Orders are kept. */
  async delete(id: string): Promise<boolean> {
    return (await runScript(this.client, CUSTOMER_DELETE, [this.keys.prefix, id])) === 1;
  }

  async count(): Promise<number> {
    return this.client.sCard(this.keys.customers());
  }
}
