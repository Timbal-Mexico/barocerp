// tests/unit/email-validation.test.js
const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function validateEmail(email) {
  return emailRegex.test(email);
}

const testCases = [
  { email: 'test@example.com', expected: true },
  { email: 'user.name+tag@sub.domain.co.uk', expected: true },
  { email: 'user123@domain.org', expected: true },
  { email: 'invalid-email', expected: false },
  { email: 'user@', expected: false },
  { email: '@domain.com', expected: false },
  { email: 'user@domain', expected: false },
  { email: 'user@domain.', expected: false },
  { email: 'user space@domain.com', expected: false },
];

let passed = 0;
let failed = 0;

console.log('Running Email Validation Unit Tests...');

testCases.forEach(({ email, expected }) => {
  const result = validateEmail(email);
  if (result === expected) {
    console.log(`PASS: "${email}" -> ${result}`);
    passed++;
  } else {
    console.error(`FAIL: "${email}" -> expected ${expected}, got ${result}`);
    failed++;
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All unit tests passed.');
}
