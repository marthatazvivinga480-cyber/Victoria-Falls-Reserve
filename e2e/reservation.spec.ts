import { test, expect } from '@playwright/test';
test('customer reserve, decline, retry, download, cancellation and admin management', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Where the river meets the remarkable.' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Email address').fill('customer@vfr.example');
  await page.getByLabel('Password').fill('ReserveDemo123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/bookings$/);
  await page.goto('/hotels');
  await expect(page.getByRole('heading', { name: 'Zambezi Crest Hotel' })).toBeVisible();
  await page.getByRole('heading', { name: 'Zambezi Crest Hotel' }).click();
  await page.getByRole('button', { name: /Save this stay|Remove from saved/ }).click();
  await expect(page.getByText('Saved stays updated.')).toBeVisible();
  const date = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  await page.getByLabel('Check-in', { exact: true }).fill(date(10));
  await page.getByLabel('Check-out', { exact: true }).fill(date(12));
  await page.getByRole('button', { name: 'Reserve room ↗' }).first().click();
  await expect(page.getByRole('heading', { name: 'Simulated card checkout' })).toBeVisible();
  await page.getByLabel('Simulation outcome').selectOption('failure');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Simulate payment/ }).click();
  await expect(page.getByText(/Simulated payment declined/)).toBeVisible();
  await page.getByLabel('Simulation outcome').selectOption('success');
  await page.getByRole('button', { name: /Simulate payment/ }).click();
  await expect(page.getByRole('heading', { name: 'We’ll see you at the Falls.' })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download confirmation' }).click();
  expect((await download).suggestedFilename()).toMatch(/^VFR-.*\.txt$/);
  await page.getByRole('button', { name: 'Cancel booking', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm cancellation' }).click();
  await expect(
    page.getByText('Booking cancelled. Any applicable simulated refund has been recorded.'),
  ).toBeVisible();
  await expect(page.getByText('Simulated refund: $240.00')).toBeVisible();
  await page.goto('/profile');
  await page.getByLabel('Full name').fill('Alex Traveller');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Your profile has been updated.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Full name')).toHaveValue('Alex Traveller');
  await page.goto('/admin');
  await expect(page.getByText('Administrator access required.')).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
  await page.goto('/login');
  await page.getByLabel('Email address').fill('admin@vfr.example');
  await page.getByLabel('Password').fill('BrowserFixtureAdmin123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/bookings$/);
  await page.goto('/admin');
  await expect(page.getByText('Net simulated revenue')).toBeVisible();
  for (const name of ['Hotels', 'Rooms', 'Bookings', 'Customers', 'Reviews', 'Payments']) {
    await page
      .getByRole('navigation', { name: 'Administration' })
      .getByRole('link', { name, exact: true })
      .click();
    await expect(page.locator('main')).not.toContainText('Something went wrong');
  }

  await page.goto('/admin/hotels');
  await page.getByRole('button', { name: 'Add hotel' }).click();
  const property = 'Browser Retreat ' + test.info().project.name + ' ' + Date.now();
  await page.getByLabel('Name', { exact: true }).fill(property);
  await page
    .getByLabel('Description', { exact: true })
    .fill('A peaceful fictional property for browser verification.');
  await page.getByRole('button', { name: 'Save hotel' }).click();
  const hotelRow = page.getByRole('row').filter({ hasText: property });
  await expect(hotelRow).toBeVisible();
  await hotelRow.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Location', { exact: true }).fill('Victoria Falls gardens');
  await page.getByRole('button', { name: 'Save hotel' }).click();
  await expect(hotelRow).toContainText('Victoria Falls gardens');
  await page.goto('/admin/rooms');
  await page.getByRole('button', { name: 'Add room' }).click();
  await page
    .getByRole('combobox', { name: 'Hotel', exact: true })
    .selectOption({ label: property });
  await page.getByLabel('Room name').fill('Browser King');
  await page.getByLabel('Description', { exact: true }).fill('A comfortable demo room.');
  await page.getByRole('button', { name: 'Save room' }).click();
  const roomRow = page.getByRole('row').filter({ hasText: property });
  await expect(roomRow).toBeVisible();
  await roomRow.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('USD / night').fill('180');
  await page.getByRole('button', { name: 'Save room' }).click();
  await expect(roomRow).toContainText('$180.00');
  await roomRow.getByRole('button', { name: 'Archive', exact: true }).click();
  await expect(roomRow).toContainText('Archived');
  await page.goto('/admin/hotels');
  await hotelRow.getByRole('button', { name: 'Archive', exact: true }).click();
  await expect(hotelRow).toContainText('Archived');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});
