import type { PatientData } from '../pages/registration/PatientRegistrationPage';

const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const digits = (n: number) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');

const FIRST = [
  'Rahim',
  'Karim',
  'Fatema',
  'Ayesha',
  'Jamal',
  'Nusrat',
  'Imran',
  'Sadia',
  'Tanvir',
  'Mitu',
];
const LAST = [
  'Uddin',
  'Ahmed',
  'Hossain',
  'Begum',
  'Khan',
  'Islam',
  'Chowdhury',
  'Akter',
  'Rahman',
  'Sultana',
];

/** Random but valid patient data for the Create Patient form. */
export function randomPatient(): PatientData {
  const gender = pick(['Male', 'Female'] as const);
  const givenName = pick(FIRST);
  const surname = pick(LAST);
  const stamp = Date.now().toString().slice(-6);

  return {
    title: gender === 'Male' ? pick(['Mr', 'MD', 'Master']) : pick(['Mrs', 'Miss', 'Most']),
    fullName: `${givenName} ${surname} AT${stamp}`,
    givenName,
    surname,
    gender,
    dob: {
      year: 1960 + Math.floor(Math.random() * 45),
      month: 1 + Math.floor(Math.random() * 12),
      day: 1 + Math.floor(Math.random() * 28),
    },
    maritalStatus: pick(['Single', 'Married']),
    religion: pick(['Islam', 'Hindu', 'Christian']),
    bloodGroup: pick(['A+', 'B+', 'O+', 'AB+', 'O-']),
    fatherName: `${pick(FIRST)} ${pick(LAST)}`,
    motherName: `${pick(FIRST)} ${pick(LAST)}`,
    mobile: `017${digits(8)}`,
    email: `auto.${stamp}@test.com`,
    idType: 'NID',
    idNo: digits(10),
    occupation: pick(['Student', 'Businessman', 'Doctor', 'Banker']),
    houseNo: String(1 + Math.floor(Math.random() * 200)),
    roadNo: String(1 + Math.floor(Math.random() * 30)),
    area: pick(['Kolatoli', 'Jhilongja', 'Bahar Chara', 'Tekpara']),
    village: pick(['Purbo Para', 'Uttar Para', 'Dokkhin Para']),
    district: 'Cox',
    thana: 'Cox',
    po: '4700',
    address: `Automation test address ${stamp}, Cox's Bazar`,
  };
}
