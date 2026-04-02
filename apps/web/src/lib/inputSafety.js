const BLOCKED_WORD_PATTERNS = [
  /\b(fuck|fucking|fucked)\b/gi,
  /\b(shit|shitty)\b/gi,
  /\b(bitch|bitches)\b/gi,
  /\b(asshole|assholes)\b/gi,
  /\b(bastard|bastards)\b/gi,
];

function collapseWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function redactBlockedTerms(value) {
  return BLOCKED_WORD_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, '[redacted]'),
    value,
  );
}

export function sanitizePlainText(value, options = {}) {
  if (value === undefined || value === null) {
    return '';
  }

  const { maxLength, preserveNewlines = false } = options;
  const normalized = String(value).replace(/\r\n/g, '\n').trim();
  const collapsed = preserveNewlines
    ? normalized
        .split('\n')
        .map((line) => collapseWhitespace(line))
        .filter(Boolean)
        .join('\n')
    : collapseWhitespace(normalized);
  const redacted = redactBlockedTerms(collapsed);
  const limited = maxLength ? redacted.slice(0, maxLength) : redacted;
  return limited;
}

export function sanitizeObjectStrings(values, config = {}) {
  const next = { ...values };
  Object.entries(config).forEach(([key, options]) => {
    if (typeof next[key] === 'string') {
      next[key] = sanitizePlainText(next[key], options);
    }
  });
  return next;
}

export function isValidEmailAddress(value) {
  const email = sanitizePlainText(value, { maxLength: 255 });
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getTodayDateInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMaxDueDateInputValue() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function validateDueDateRange(value, options = {}) {
  if (!value) {
    return null;
  }

  const min = options.min ?? getTodayDateInputValue();
  const max = options.max ?? getMaxDueDateInputValue();

  if (value < min) {
    return 'Due date cannot be in the past.';
  }

  if (value > max) {
    return 'Due date cannot be more than one year out.';
  }

  return null;
}

export function formatDateLabel(value) {
  if (!value) {
    return '';
  }

  const normalized = String(value).trim();
  const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = dateOnlyMatch
    ? new Date(`${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}T12:00:00`)
    : new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return normalized.replace(/\s+00:00(?::00)?$/, '');
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTimeLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatTimeRange(start, end) {
  return `${formatTimeLabel(start)} - ${formatTimeLabel(end)}`;
}
