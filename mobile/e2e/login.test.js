describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should have email and password inputs', async () => {
    await expect(element(by.id('emailInput'))).toBeVisible();
    await expect(element(by.id('passwordInput'))).toBeVisible();
  });

  it('should show validation error on empty submit', async () => {
    await element(by.id('loginButton')).tap();
    await expect(element(by.text('OK'))).toBeVisible(); // Alert "Validation Error" -> OK
    await element(by.text('OK')).tap();
  });

  it('should allow user to type credentials and login', async () => {
    await element(by.id('emailInput')).typeText('test@example.com');
    await element(by.id('passwordInput')).typeText('password123');
    await element(by.id('passwordInput')).tapReturnKey();
    
    await element(by.id('loginButton')).tap();
  });
});
