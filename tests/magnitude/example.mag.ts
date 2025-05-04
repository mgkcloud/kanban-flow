import { test } from 'magnitude-test';

/**
 * Authentication Tests
 * 
 * These tests verify the login, signup, and basic authentication functionality
 * of the Kanban Flow application.
 */

test('can access the login page', { url: 'https://tasks.feistyagency.com/login' })
  .step('Check login page loads correctly')
    .check('Login page is visible with email and password fields')
    .check('Page contains login button')

test('can access the signup page', { url: 'https://tasks.feistyagency.com/signup' })
  .step('Check signup page loads correctly')
    .check('Signup page is visible with registration form')
    .check('Page contains signup button')

test('shows validation errors on login form', { url: 'https://tasks.feistyagency.com/login' })
  .step('Attempt to log in with empty credentials')
    .check('Login button should be present')
    .check('Can see validation errors when submitting empty form')
  
test('shows validation errors on signup form', { url: 'https://tasks.feistyagency.com/signup' })
  .step('Attempt to sign up with empty credentials')
    .check('Signup button should be present')
    .check('Can see validation errors when submitting empty form')
