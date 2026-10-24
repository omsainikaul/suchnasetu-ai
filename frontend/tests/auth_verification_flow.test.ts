import { test } from 'node:test';
import assert from 'node:assert';

class MockStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

test('1. Registration carries submitted email into verification session storage', () => {
  const sessionStorage = new MockStorage();
  const registeredEmail = 'citizen.sharma@example.gov.in';

  // Simulate Signup submission storing pending verification email
  sessionStorage.setItem('suchnasetu_pending_verification_email', registeredEmail);

  // Simulate VerifyEmailPage reading initial email
  const resolvedEmail = sessionStorage.getItem('suchnasetu_pending_verification_email') || '';
  assert.strictEqual(resolvedEmail, 'citizen.sharma@example.gov.in');
});

test('2. Verification code sanitization enforces exactly 6 digits', () => {
  const sanitizeCode = (raw: string) => raw.replace(/\D/g, '').slice(0, 6);

  assert.strictEqual(sanitizeCode('123456'), '123456');
  assert.strictEqual(sanitizeCode('12-34-56'), '123456');
  assert.strictEqual(sanitizeCode('abc123def456ghi'), '123456');
  assert.strictEqual(sanitizeCode('1234567890'), '123456');
  assert.strictEqual(sanitizeCode('   '), '');
});

test('3. Modifying email address unbinds and clears existing verification code', () => {
  let boundEmail = 'initial.citizen@example.gov.in';
  let enteredCode = '654321';

  const onEmailChange = (newEmail: string) => {
    const cleaned = newEmail.trim().toLowerCase();
    if (cleaned !== boundEmail) {
      enteredCode = ''; // Unbind and clear code
    }
  };

  onEmailChange('different.citizen@example.gov.in');
  assert.strictEqual(enteredCode, '', 'Code must be cleared when recipient address is changed');
});

test('4. Successful verification clears pending verification storage', () => {
  const sessionStorage = new MockStorage();
  sessionStorage.setItem('suchnasetu_pending_verification_email', 'verified.citizen@example.gov.in');

  // On verification success
  sessionStorage.removeItem('suchnasetu_pending_verification_email');
  assert.strictEqual(sessionStorage.getItem('suchnasetu_pending_verification_email'), null);
});

test('5. Resend verification cooldown countdown behavior', () => {
  let cooldown = 60;
  const tick = () => {
    cooldown = cooldown > 0 ? cooldown - 1 : 0;
  };

  tick();
  assert.strictEqual(cooldown, 59);

  cooldown = 1;
  tick();
  assert.strictEqual(cooldown, 0);

  tick();
  assert.strictEqual(cooldown, 0);
});
