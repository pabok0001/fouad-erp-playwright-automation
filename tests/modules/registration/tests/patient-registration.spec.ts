import { test, expect } from '@playwright/test';
import { PatientRegistrationPage } from '../pages/PatientRegistrationPage';
import { randomPatient } from '../utils/patientData';

test.describe('Patient registration', () => {
  test('register a new patient with random data', async ({ page }) => {
    const reg = new PatientRegistrationPage(page);
    const patient = randomPatient();
    test.info().annotations.push({ type: 'patient', description: JSON.stringify(patient) });

    await reg.gotoList();
    await reg.openAddNew();
    await reg.fillForm(patient);

    const patientId = await reg.confirm();
    test.info().annotations.push({ type: 'patientId', description: patientId });
    console.log(`Registered "${patient.fullName}" → Patient ID ${patientId}`);

    expect(patientId).toMatch(/^\d+$/);
  });
});
