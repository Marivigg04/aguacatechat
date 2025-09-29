export function getPasswordStrengthInfo(pwd) {
  let strength = 0;
  let text = '';
  let level = 'none';

  if (!pwd || pwd.length === 0) {
    return { text: '', level: 'none' };
  }

  strength = 1;
  if (pwd.length >= 6) strength++;
  if (pwd.length >= 8 && /[A-Z]/.test(pwd)) strength++;
  if (pwd.length >= 10 && /[0-9]/.test(pwd)) strength++;
  if (pwd.length >= 12 && /[^A-Za-z0-9]/.test(pwd)) strength++;

  if (strength === 1) {
    text = 'Débil';
    level = 'low';
  } else if (strength === 2) {
    text = 'Normal';
    level = 'medium';
  } else if (strength === 3) {
    text = 'Fuerte';
    level = 'strong';
  } else if (strength >= 4) {
    text = 'Muy Fuerte';
    level = 'very-strong';
  }

  return { text, level };
}

export default getPasswordStrengthInfo;
