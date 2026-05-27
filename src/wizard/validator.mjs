/**
 * Input validators for wizard prompts
 */

import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

export function required(message = 'This field is required') {
  return (value) => {
    if (typeof value === 'string' && value.trim().length === 0) return message;
    if (value === undefined || value === null) return message;
    return true;
  };
}

export function isDirectory(message = 'Path must be an existing directory') {
  return (value) => {
    const path = resolve(value.trim());
    if (!existsSync(path)) return `Directory not found: ${path}`;
    if (!statSync(path).isDirectory()) return `Not a directory: ${path}`;
    return true;
  };
}

export function inRange(min, max, message) {
  return (value) => {
    const num = Number(value);
    if (isNaN(num)) return message || `Must be a number between ${min} and ${max}`;
    if (num < min || num > max) return message || `Must be between ${min} and ${max}`;
    return true;
  };
}

export function isUrl(message = 'Must be a valid URL') {
  return (value) => {
    if (!value || value.trim().length === 0) return true; // optional
    try {
      new URL(value.trim());
      return true;
    } catch {
      return message;
    }
  };
}
