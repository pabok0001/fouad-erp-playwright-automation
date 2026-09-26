import { Page, Locator, expect } from '@playwright/test';

export interface PatientData {
  title: string;
  fullName: string;
  givenName: string;
  surname: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: { year: number; month: number; day: number };
  maritalStatus: string;
  religion: string;
  bloodGroup: string;
  fatherName: string;
  motherName: string;
  mobile: string;
  email: string;
  idType: string;
  idNo: string;
  occupation: string;
  houseNo: string;
  roadNo: string;
  area: string;
  village: string;
  district: string;
  thana: string;
  po: string;
  address: string;
}

/**
 * Registration list page (/hospital/newregistration) and the
 * "Create Patient" form it opens (/hospital/patients/new).
 * The form is MudBlazor: selects are readonly inputs that open a popover
 * list, and once a value is chosen the <input> becomes hidden and a <div>
 * shows the value — so controls are located by their label, not by role.
 */
export class PatientRegistrationPage {
  readonly page: Page;
  readonly addNew: Locator;
  readonly createPatientHeading: Locator;
  readonly confirmButton: Locator;
  readonly popover: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addNew = page.getByRole('link', { name: 'Add New' });
    this.createPatientHeading = page.getByRole('heading', { name: 'Create Patient' });
    this.confirmButton = page.getByRole('button', { name: /Confirm Registeration/i });
    this.popover = page.locator('.mud-popover-open');
  }

  async gotoList() {
    await this.page.goto('/hospital/newregistration');
    await expect(this.page.getByRole('heading', { name: 'PATIENT REGISTRATION' })).toBeVisible();
  }

  async openAddNew() {
    await this.addNew.click();
    await expect(this.page).toHaveURL(/hospital\/patients\/new/);
    await expect(this.createPatientHeading).toBeVisible();
    // Let the Blazor component finish its initial data fetch.
    await expect(this.page.getByRole('alert').filter({ hasText: 'Succesfully Fetched' }))
      .toBeVisible({ timeout: 15_000 })
      .catch(() => {});
  }

  /** MudBlazor input control wrapper, found by its label text. */
  control(label: string): Locator {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page
      .locator('.mud-input-control', { has: this.page.locator('label', { hasText: new RegExp(`^${escaped}\\*?$`) }) })
      .first();
  }

  text(label: string): Locator {
    return this.control(label).locator('input, textarea').first();
  }

  async fillText(label: string, value: string) {
    await this.text(label).fill(value);
  }

  /** Open a MudSelect by label and pick an option by its exact text. */
  async select(label: string, option: string) {
    await this.control(label).locator('.mud-input.mud-select-input').click();
    await expect(this.popover).toBeVisible();
    await this.popover
      .locator('.mud-list-item')
      .filter({ hasText: new RegExp(`^\\s*${option.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) })
      .first()
      .click();
    await expect(this.popover).toBeHidden();
  }

  /** MudAutocomplete: type a query and pick the first suggestion. */
  async autocomplete(label: string, query: string) {
    const input = this.text(label);
    await input.fill(query);
    const first = this.popover.locator('.mud-list-item').first();
    await expect(first).toBeVisible({ timeout: 10_000 });
    await first.click();
    await expect(this.popover).toBeHidden();
  }

  /**
   * DOB is a readonly MudDatePicker: header year button → year list →
   * month grid → day grid. `month` is 1-12.
   */
  async pickDob(year: number, month: number, day: number) {
    await this.text('DOB').click();
    await expect(this.popover).toBeVisible();
    const picker = this.popover.filter({ has: this.page.locator('.mud-picker') }).first();
    // Toolbar year button (shows current year) opens the year list.
    await picker.getByRole('toolbar').getByRole('button').first().click();
    await picker.locator('.mud-picker-year').filter({ hasText: new RegExp(`^\\s*${year}\\s*$`) }).first().click();
    const monthName = new Date(2000, month - 1, 1).toLocaleString('en-US', { month: 'long' });
    await picker.getByRole('button', { name: monthName, exact: true }).click();
    await picker.locator('button.mud-picker-calendar-day:not(.mud-hidden):not([disabled])')
      .filter({ hasText: new RegExp(`^\\s*${day}\\s*$`) })
      .first()
      .click();
    await expect(this.text('DOB')).not.toHaveValue('');
  }

  async fillForm(d: PatientData) {
    await this.select('Title', d.title);
    await this.fillText('Full Name', d.fullName);
    await this.fillText('Given Name', d.givenName);
    await this.fillText('Surname', d.surname);
    await this.select('Gender', d.gender);
    await this.pickDob(d.dob.year, d.dob.month, d.dob.day);
    await this.select('Marital Status', d.maritalStatus);
    await this.select('Religion', d.religion);
    await this.select('Blood Group', d.bloodGroup);
    await this.fillText('Father Name', d.fatherName);
    await this.fillText('Mother Name', d.motherName);
    await this.fillText('Mobile No', d.mobile);
    await this.fillText('Email', d.email);
    await this.select('ID Type', d.idType);
    await this.fillText('IDNo', d.idNo);
    await this.select('Occupation', d.occupation);
    await this.fillText('House No', d.houseNo);
    await this.fillText('Road No', d.roadNo);
    await this.fillText('Area', d.area);
    await this.fillText('Village', d.village);
    await this.autocomplete('District', d.district);
    await this.autocomplete('Thana', d.thana);
    await this.fillText('PO', d.po);
    await this.fillText('Patient Address', d.address);
  }

  /**
   * Click "Confirm Registeration", wait for the "Conform" success dialog,
   * close it with OK and return the new Patient ID shown in the message.
   */
  async confirm(): Promise<string> {
    await this.confirmButton.click();
    const dialog = this.page.getByRole('dialog').filter({ hasText: /Patient ID/i });
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    const message = await dialog.getByText(/SuccessFully Save/i).innerText();
    const patientId = message.match(/Patient ID\s*(\d+)/i)?.[1];
    expect(patientId, `patient ID in "${message}"`).toBeTruthy();
    await dialog.getByRole('button', { name: 'OK' }).click();
    await expect(dialog).toBeHidden();
    return patientId!;
  }
}
