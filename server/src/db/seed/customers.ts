import type { CustomerInput } from '../../schemas/customer.js';

/** Demo accounts for development. Emails use the reserved example.com domain. */
export const SEED_CUSTOMERS: CustomerInput[] = [
  {
    email: 'alex.nguyen@example.com',
    name: 'Alex Nguyen',
    phone: '+84 90 123 4567',
    address: {
      line1: '12 Nguyen Hue',
      city: 'Ho Chi Minh City',
      postalCode: '700000',
      country: 'VN',
    },
  },
  {
    email: 'sam.taylor@example.com',
    name: 'Sam Taylor',
    address: {
      line1: '221 Market Street',
      line2: 'Apt 4B',
      city: 'San Francisco',
      region: 'CA',
      postalCode: '94105',
      country: 'US',
    },
  },
  {
    email: 'jordan.lee@example.com',
    name: 'Jordan Lee',
    phone: '+44 20 7946 0000',
  },
];
