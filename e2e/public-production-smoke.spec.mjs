import { expect, test } from 'playwright/test'

test.describe('Public Production Smoke', () => {
  test('home and legal pages render core content', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /turn every job post/i })).toBeVisible()

    await page.goto('/pricing')
    await expect(page.getByRole('heading', { name: /pricing built for job-search momentum/i })).toBeVisible()

    await page.goto('/terms')
    await expect(page.getByRole('heading', { name: /terms of service/i })).toBeVisible()

    await page.goto('/privacy')
    await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible()
  })

  test('auth pages and reset flow entry load', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible()

    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()

    await page.goto('/forgot-password')
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible()
  })
})
