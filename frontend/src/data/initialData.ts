import { LabTest } from '../types';

// Deliberately empty — real lab tests are added via Inventory > Add Lab
// Stock and flow through the same medicines API as everything else. This
// used to ship 6 fake diagnostic tests (with made-up prices) that appeared
// in every fresh install's POS Lab billing mode regardless of what the
// pharmacy actually offers.
export const initialLabTests: LabTest[] = [];

export const initialBrandSaltDictionary: Record<
  string,
  {
    salt: string;
    category: string;
    alternatives: Array<{ name: string; company: string; mrp: number }>;
  }
> = {
  'nexpro l': {
    salt: 'Esomeprazole 40mg + Levosulpiride 75mg',
    category: 'Antacid / GERD & Dyspepsia',
    alternatives: [
      { name: 'Pan L', company: 'Alkem', mrp: 220.0 },
      { name: 'Pantocid L', company: 'Sun Pharma', mrp: 235.0 },
    ],
  },
  'nexpro rd': {
    salt: 'Esomeprazole 40mg + Domperidone 30mg',
    category: 'Antacid / Anti-emetic',
    alternatives: [
      { name: 'Pan D', company: 'Alkem', mrp: 180.0 },
      { name: 'Cyra D', company: 'Systopic', mrp: 140.0 },
    ],
  },
  'pan l': {
    salt: 'Pantoprazole 40mg + Levosulpiride 75mg',
    category: 'Antacid / GERD & Dyspepsia',
    alternatives: [
      { name: 'Pantocid L', company: 'Sun Pharma', mrp: 235.0 },
      { name: 'Nexpro L', company: 'Torrent', mrp: 245.0 },
    ],
  },
  'pan d': {
    salt: 'Pantoprazole 40mg + Domperidone 30mg',
    category: 'Antacid / Anti-emetic',
    alternatives: [
      { name: 'Pantocid D', company: 'Sun Pharma', mrp: 185.0 },
      { name: 'Cyra D', company: 'Systopic', mrp: 140.0 },
    ],
  },
  'pantocid l': {
    salt: 'Pantoprazole 40mg + Levosulpiride 75mg',
    category: 'Antacid / GERD',
    alternatives: [{ name: 'Pan L', company: 'Alkem', mrp: 220.0 }],
  },
  'pantocid d': {
    salt: 'Pantoprazole 40mg + Domperidone 30mg',
    category: 'Antacid / Anti-emetic',
    alternatives: [{ name: 'Pan D', company: 'Alkem', mrp: 180.0 }],
  },
  'cyra d': {
    salt: 'Rabeprazole 20mg + Domperidone 30mg',
    category: 'Antacid / GERD',
    alternatives: [
      { name: 'Razo D', company: 'Dr. Reddy', mrp: 160.0 },
      { name: 'Happi D', company: 'Zydus', mrp: 155.0 },
    ],
  },
  'razo d': {
    salt: 'Rabeprazole 20mg + Domperidone 30mg',
    category: 'Antacid / GERD',
    alternatives: [{ name: 'Cyra D', company: 'Systopic', mrp: 140.0 }],
  },
  'happi d': {
    salt: 'Rabeprazole 20mg + Domperidone 30mg',
    category: 'Antacid / GERD',
    alternatives: [{ name: 'Cyra D', company: 'Systopic', mrp: 140.0 }],
  },
  'dolo 650': {
    salt: 'Paracetamol 650mg',
    category: 'Analgesic / Antipyretic',
    alternatives: [
      { name: 'Calpol 650mg', company: 'GSK', mrp: 31.0 },
      { name: 'Pacimol 650mg', company: 'Ipca', mrp: 28.0 },
    ],
  },
  'calpol 650': {
    salt: 'Paracetamol 650mg',
    category: 'Analgesic / Antipyretic',
    alternatives: [{ name: 'Dolo 650mg', company: 'Micro Labs', mrp: 30.0 }],
  },
  'pacimol 650': {
    salt: 'Paracetamol 650mg',
    category: 'Analgesic / Antipyretic',
    alternatives: [{ name: 'Dolo 650mg', company: 'Micro Labs', mrp: 30.0 }],
  },
  'augmentin 625': {
    salt: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
    category: 'Broad Spectrum Antibiotic',
    alternatives: [
      { name: 'Moxikind CV 625', company: 'Mankind', mrp: 175.0 },
      { name: 'Clavam 625', company: 'Alkem', mrp: 185.0 },
    ],
  },
  'moxikind cv 625': {
    salt: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
    category: 'Antibiotic',
    alternatives: [{ name: 'Augmentin 625', company: 'GSK', mrp: 200.0 }],
  },
  'ecosprin 75': {
    salt: 'Aspirin 75mg',
    category: 'Blood Thinner / Antiplatelet',
    alternatives: [
      { name: 'Delisprin 75mg', company: 'Aristo', mrp: 4.8 },
      { name: 'Alaspran 75mg', company: 'Alkem', mrp: 5.2 },
    ],
  },
  'delisprin 75': {
    salt: 'Aspirin 75mg',
    category: 'Blood Thinner / Antiplatelet',
    alternatives: [{ name: 'Ecosprin 75mg', company: 'USV', mrp: 5.0 }],
  },
  'eno': {
    salt: 'Sodium Bicarbonate + Citric Acid',
    category: 'Antacid',
    alternatives: [
      { name: 'Gas-O-Fast', company: 'Mankind', mrp: 8.5 },
      { name: 'Digene Gel', company: 'Abbott', mrp: 12.0 },
    ],
  },
};
