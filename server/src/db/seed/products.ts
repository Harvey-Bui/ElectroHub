import type { Category, ProductInput } from '../../schemas/product.js';

/**
 * Catalogue seed: 21 products, 3 per category. Stable ids make the seed
 * idempotent; fixed creation dates make "newest" ordering reproducible.
 *
 * Edge cases on purpose:
 *  - msi-katana-15-b13v              stock 0  → inventory:out-of-stock
 *  - lenovo-thinkpad-x1-carbon-gen12 stock 1  → last unit (concurrency demo)
 */

const image = (name: string) =>
  `https://placehold.co/800x600/1d5ef1/ffffff/png?text=${encodeURIComponent(name)}`;

const day = (n: number) => new Date(Date.UTC(2026, 9, 1 + n, 9, 0, 0)).toISOString();

type SeedProduct = Omit<ProductInput, 'imageUrl' | 'createdAt'> & { category: Category };

const products: SeedProduct[] = [
  // ── Gaming laptops ──────────────────────────────────────────────────────
  {
    id: 'asus-rog-strix-g16-2025',
    name: 'ASUS ROG Strix G16 (2025)',
    brand: 'ASUS',
    category: 'gaming-laptops',
    description:
      '16-inch gaming laptop with a 240 Hz QHD+ panel, Intel Core i9 HX processor and GeForce RTX 5070 Ti graphics, cooled by a tri-fan vapour chamber.',
    priceCents: 219999,
    stock: 12,
    featured: true,
    specs: {
      cpu: 'Intel Core i9-14900HX',
      gpu: 'NVIDIA GeForce RTX 5070 Ti 12GB',
      ramGb: 32,
      storage: '1TB PCIe 4.0 NVMe SSD',
      display: '16" 2560x1600 IPS, 240Hz',
      weightKg: 2.5,
      os: 'Windows 11 Home',
    },
  },
  {
    id: 'lenovo-legion-pro-7i-gen9',
    name: 'Lenovo Legion Pro 7i Gen 9',
    brand: 'Lenovo',
    category: 'gaming-laptops',
    description:
      'Flagship 16-inch gaming laptop with RTX 4090 graphics, a 240 Hz Mini-LED-class display and Legion ColdFront cooling.',
    priceCents: 329999,
    stock: 5,
    specs: {
      cpu: 'Intel Core i9-14900HX',
      gpu: 'NVIDIA GeForce RTX 4090 16GB',
      ramGb: 32,
      storage: '2TB PCIe 4.0 NVMe SSD',
      display: '16" 2560x1600 IPS, 240Hz',
      weightKg: 2.8,
      os: 'Windows 11 Pro',
    },
  },
  {
    id: 'msi-katana-15-b13v',
    name: 'MSI Katana 15 B13V',
    brand: 'MSI',
    category: 'gaming-laptops',
    description:
      'Entry-level 15.6-inch gaming laptop with RTX 4060 graphics and a 144 Hz display. A solid first gaming machine.',
    priceCents: 109999,
    stock: 0,
    specs: {
      cpu: 'Intel Core i7-13620H',
      gpu: 'NVIDIA GeForce RTX 4060 8GB',
      ramGb: 16,
      storage: '1TB NVMe SSD',
      display: '15.6" 1920x1080 IPS, 144Hz',
      weightKg: 2.25,
      os: 'Windows 11 Home',
    },
  },

  // ── Laptops ─────────────────────────────────────────────────────────────
  {
    id: 'apple-macbook-air-13-m3',
    name: 'Apple MacBook Air 13" (M3)',
    brand: 'Apple',
    category: 'laptops',
    description:
      'Fanless 13.6-inch ultraportable with the Apple M3 chip, Liquid Retina display and up to 18 hours of battery life.',
    priceCents: 109900,
    stock: 25,
    featured: true,
    specs: {
      cpu: 'Apple M3 (8-core CPU)',
      gpu: 'Apple M3 10-core GPU',
      ramGb: 16,
      storage: '512GB SSD',
      display: '13.6" 2560x1664 Liquid Retina',
      batteryHours: 18,
      weightKg: 1.24,
      os: 'macOS',
    },
  },
  {
    id: 'dell-xps-14-9440',
    name: 'Dell XPS 14 (9440)',
    brand: 'Dell',
    category: 'laptops',
    description:
      'Premium 14.5-inch laptop machined from aluminium, with Intel Core Ultra processor, OLED touch display option and a haptic touchpad.',
    priceCents: 169999,
    stock: 8,
    specs: {
      cpu: 'Intel Core Ultra 7 155H',
      gpu: 'NVIDIA GeForce RTX 4050 6GB',
      ramGb: 32,
      storage: '1TB NVMe SSD',
      display: '14.5" 3200x2000 OLED touch, 120Hz',
      weightKg: 1.68,
      os: 'Windows 11 Pro',
    },
  },
  {
    id: 'lenovo-thinkpad-x1-carbon-gen12',
    name: 'Lenovo ThinkPad X1 Carbon Gen 12',
    brand: 'Lenovo',
    category: 'laptops',
    description:
      'Business ultrabook weighing just over 1 kg, with a legendary keyboard, Intel vPro and MIL-STD-810H durability.',
    priceCents: 189900,
    stock: 1,
    specs: {
      cpu: 'Intel Core Ultra 7 165U vPro',
      gpu: 'Intel Graphics',
      ramGb: 32,
      storage: '1TB NVMe SSD',
      display: '14" 2880x1800 OLED',
      weightKg: 1.09,
      os: 'Windows 11 Pro',
    },
  },

  // ── PCs ─────────────────────────────────────────────────────────────────
  {
    id: 'hp-omen-45l-desktop',
    name: 'HP OMEN 45L Gaming Desktop',
    brand: 'HP',
    category: 'pcs',
    description:
      'Full-tower gaming PC with the OMEN Cryo Chamber that keeps the CPU radiator outside the main case for lower temperatures.',
    priceCents: 279999,
    stock: 4,
    specs: {
      cpu: 'Intel Core i9-14900K',
      gpu: 'NVIDIA GeForce RTX 4080 SUPER 16GB',
      ramGb: 64,
      storage: '2TB NVMe SSD',
      psuWatts: 1200,
      formFactor: 'Full tower',
      os: 'Windows 11 Home',
    },
  },
  {
    id: 'alienware-aurora-r16',
    name: 'Alienware Aurora R16',
    brand: 'Alienware',
    category: 'pcs',
    description:
      'Compact, quiet gaming desktop with a redesigned airflow chassis and room for top-tier graphics cards.',
    priceCents: 239999,
    stock: 6,
    featured: true,
    specs: {
      cpu: 'Intel Core i7-14700F',
      gpu: 'NVIDIA GeForce RTX 4070 Ti SUPER 16GB',
      ramGb: 32,
      storage: '1TB NVMe SSD',
      psuWatts: 1000,
      formFactor: 'Mid tower',
      os: 'Windows 11 Home',
    },
  },
  {
    id: 'apple-mac-mini-m4',
    name: 'Apple Mac mini (M4)',
    brand: 'Apple',
    category: 'pcs',
    description:
      'Five-inch-square desktop powered by the Apple M4 chip, with front USB-C ports and support for up to three displays.',
    priceCents: 59900,
    stock: 30,
    specs: {
      cpu: 'Apple M4 (10-core CPU)',
      gpu: 'Apple M4 10-core GPU',
      ramGb: 16,
      storage: '256GB SSD',
      ports: ['2x USB-C front', '3x Thunderbolt 4', 'HDMI', 'Gigabit Ethernet'],
      formFactor: 'Ultra compact',
      os: 'macOS',
    },
  },

  // ── Mice ────────────────────────────────────────────────────────────────
  {
    id: 'logitech-g-pro-x-superlight-2',
    name: 'Logitech G PRO X SUPERLIGHT 2',
    brand: 'Logitech',
    category: 'mice',
    description:
      '60 g wireless esports mouse with the HERO 2 sensor, LIGHTFORCE hybrid switches and up to 95 hours of battery.',
    priceCents: 15999,
    stock: 40,
    featured: true,
    specs: {
      sensor: 'HERO 2',
      maxDpi: 32000,
      weightGrams: 60,
      connectivity: ['LIGHTSPEED wireless', 'USB-C'],
      batteryHours: 95,
      wireless: true,
    },
  },
  {
    id: 'razer-deathadder-v3-pro',
    name: 'Razer DeathAdder V3 Pro',
    brand: 'Razer',
    category: 'mice',
    description:
      'Ergonomic right-handed wireless mouse at 63 g with the Focus Pro 30K optical sensor and Gen-3 optical switches.',
    priceCents: 14999,
    stock: 18,
    specs: {
      sensor: 'Focus Pro 30K',
      maxDpi: 30000,
      weightGrams: 63,
      connectivity: ['HyperSpeed wireless', 'USB-C'],
      batteryHours: 90,
      wireless: true,
    },
  },
  {
    id: 'logitech-mx-master-3s',
    name: 'Logitech MX Master 3S',
    brand: 'Logitech',
    category: 'mice',
    description:
      'Productivity mouse with quiet clicks, MagSpeed electromagnetic scrolling and an 8K DPI sensor that tracks on glass.',
    priceCents: 9999,
    stock: 55,
    specs: {
      sensor: 'Darkfield 8K',
      maxDpi: 8000,
      weightGrams: 141,
      connectivity: ['Bluetooth', 'Logi Bolt'],
      batteryHours: 1680,
      wireless: true,
    },
  },

  // ── Monitors ────────────────────────────────────────────────────────────
  {
    id: 'lg-ultragear-27gr95qe',
    name: 'LG UltraGear 27GR95QE-B',
    brand: 'LG',
    category: 'monitors',
    description:
      '27-inch QHD OLED gaming monitor with a 240 Hz refresh rate and 0.03 ms response time.',
    priceCents: 79999,
    stock: 7,
    specs: {
      sizeInches: 27,
      resolution: '2560x1440',
      panel: 'OLED',
      refreshHz: 240,
      responseMs: 0.03,
      hdr: 'HDR10',
      ports: ['2x HDMI 2.1', 'DisplayPort 1.4'],
    },
  },
  {
    id: 'dell-ultrasharp-u2723qe',
    name: 'Dell UltraSharp 27 4K USB-C Hub Monitor (U2723QE)',
    brand: 'Dell',
    category: 'monitors',
    description:
      '27-inch 4K IPS Black monitor with 90 W USB-C power delivery, built-in KVM and RJ45 for a one-cable desk setup.',
    priceCents: 57999,
    stock: 10,
    specs: {
      sizeInches: 27,
      resolution: '3840x2160',
      panel: 'IPS Black',
      refreshHz: 60,
      usbCPowerWatts: 90,
      ports: ['USB-C 90W', 'HDMI', 'DisplayPort', 'RJ45'],
    },
  },
  {
    id: 'samsung-odyssey-g9-g95sc',
    name: 'Samsung Odyssey OLED G9 (G95SC)',
    brand: 'Samsung',
    category: 'monitors',
    description:
      '49-inch 32:9 curved OLED super-ultrawide with a 240 Hz refresh rate, equal to two 27-inch QHD screens side by side.',
    priceCents: 129999,
    stock: 3,
    specs: {
      sizeInches: 49,
      resolution: '5120x1440',
      panel: 'QD-OLED',
      refreshHz: 240,
      curvature: '1800R',
      hdr: 'VESA DisplayHDR True Black 400',
    },
  },

  // ── Headphones ──────────────────────────────────────────────────────────
  {
    id: 'sony-wh-1000xm5',
    name: 'Sony WH-1000XM5',
    brand: 'Sony',
    category: 'headphones',
    description:
      'Wireless noise-cancelling over-ear headphones with eight microphones, 30-hour battery and multipoint Bluetooth.',
    priceCents: 39999,
    stock: 22,
    featured: true,
    specs: {
      type: 'Over-ear, closed-back',
      wireless: true,
      noiseCancelling: true,
      batteryHours: 30,
      codecs: ['SBC', 'AAC', 'LDAC'],
      weightGrams: 250,
    },
  },
  {
    id: 'steelseries-arctis-nova-pro-wireless',
    name: 'SteelSeries Arctis Nova Pro Wireless',
    brand: 'SteelSeries',
    category: 'headphones',
    description:
      'Gaming headset with active noise cancellation, a hot-swappable dual battery system and a base station for PC and console.',
    priceCents: 34999,
    stock: 9,
    specs: {
      type: 'Over-ear, closed-back',
      wireless: true,
      noiseCancelling: true,
      batteryHours: 22,
      microphone: 'Retractable ClearCast Gen 2',
      platforms: ['PC', 'PlayStation', 'Switch'],
    },
  },
  {
    id: 'sennheiser-hd-660s2',
    name: 'Sennheiser HD 660S2',
    brand: 'Sennheiser',
    category: 'headphones',
    description:
      'Open-back audiophile headphones with 300-ohm transducers tuned for deeper sub-bass and a natural, airy soundstage.',
    priceCents: 59999,
    stock: 2,
    specs: {
      type: 'Over-ear, open-back',
      wireless: false,
      impedanceOhms: 300,
      frequencyResponse: '8 Hz - 41.5 kHz',
      connectors: ['6.35mm', '4.4mm balanced'],
      weightGrams: 260,
    },
  },

  // ── Microphones ─────────────────────────────────────────────────────────
  {
    id: 'shure-sm7b',
    name: 'Shure SM7B',
    brand: 'Shure',
    category: 'microphones',
    description:
      'Dynamic broadcast microphone used in radio and podcast studios worldwide, with internal shock isolation and a pop filter.',
    priceCents: 39900,
    stock: 11,
    specs: {
      type: 'Dynamic',
      polarPattern: 'Cardioid',
      connection: 'XLR',
      frequencyResponse: '50 Hz - 20 kHz',
      requiresInterface: true,
    },
  },
  {
    id: 'rode-podmic-usb',
    name: 'RØDE PodMic USB',
    brand: 'RØDE',
    category: 'microphones',
    description:
      'Broadcast-grade dynamic microphone with both USB-C and XLR outputs and built-in Revolution Preamp DSP.',
    priceCents: 19900,
    stock: 14,
    specs: {
      type: 'Dynamic',
      polarPattern: 'Cardioid',
      connection: ['USB-C', 'XLR'],
      sampleRateKhz: 48,
      requiresInterface: false,
    },
  },
  {
    id: 'elgato-wave-3',
    name: 'Elgato Wave:3',
    brand: 'Elgato',
    category: 'microphones',
    description:
      'USB condenser microphone for streamers with Clipguard anti-distortion and Wave Link digital mixing software.',
    priceCents: 14999,
    stock: 16,
    specs: {
      type: 'Condenser',
      polarPattern: 'Cardioid',
      connection: 'USB-C',
      sampleRateKhz: 96,
      bitDepth: 24,
      requiresInterface: false,
    },
  },
];

export const SEED_PRODUCTS: ProductInput[] = products.map((product, index) => ({
  ...product,
  imageUrl: image(product.name),
  createdAt: day(index),
}));
