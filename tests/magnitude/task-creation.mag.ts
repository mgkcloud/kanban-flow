import { test } from 'magnitude-test';

/**
 * Task Creation, Editing, and Deletion Tests
 *
 * These tests assume the user is authenticated and can perform all CRUD operations
 * on tasks in the Kanban Flow application.
 */

const appUrl = 'https://tasks.feistyagency.com';

// --- Task Creation ---
test('can create a new task with all fields', { url: appUrl })
  .step('Open new task form')
    .check('New task form is visible')
  .step('Fill out all fields')
    .data({
      title: 'Test Task Full',
      description: 'This is a test task created by Magnitude.',
      priority: 'high',
      assignee: 'Select a user',
      dueDate: 'Pick a date in the future'
    })
    .check('All fields are filled')
  .step('Submit the form')
    .check('Task is created and appears in the To Do column')
    .check('Task card shows correct title, description, priority, assignee, and due date')

// --- Validation ---
test('shows validation errors on empty task creation', { url: appUrl })
  .step('Open new task form')
    .check('New task form is visible')
  .step('Submit the form without filling fields')
    .check('Validation errors are shown for required fields')

// --- Minimal Task ---
test('can create a task with minimal fields', { url: appUrl })
  .step('Open new task form')
    .check('New task form is visible')
  .step('Fill only the title')
    .data({ title: 'Minimal Task' })
    .check('Title field is filled')
  .step('Submit the form')
    .check('Task is created and appears in the To Do column')
    .check('Task card shows correct title')

// --- Duplicate Task ---
test('shows error when creating a duplicate task', { url: appUrl })
  .step('Open new task form')
    .check('New task form is visible')
  .step('Fill title with an existing task name')
    .data({ title: 'Minimal Task' })
    .check('Title field is filled')
  .step('Submit the form')
    .check('Duplicate task error is shown')

// --- Editing ---
test('can edit an existing task', { url: appUrl })
  .step('Find a task in To Do column')
    .check('Task card is visible')
  .step('Open edit form for the task')
    .check('Edit task form is visible')
  .step('Change title, description, priority, and due date')
    .data({
      title: 'Edited Task',
      description: 'Edited by Magnitude',
      priority: 'medium',
      dueDate: 'Pick a new date'
    })
    .check('Fields are updated')
  .step('Submit the form')
    .check('Task card updates with new values')

// --- Status Change (Drag & Drop) ---
test('can move a task between columns', { url: appUrl })
  .step('Find a task in To Do column')
    .check('Task card is visible')
  .step('Drag task to In Progress column')
    .data('Drag and drop the task card to In Progress')
    .check('Task appears in In Progress column')
    .check('Task no longer appears in To Do column')
  .step('Drag task to Done column')
    .data('Drag and drop the task card to Done')
    .check('Task appears in Done column')
    .check('Task no longer appears in In Progress column')

// --- Deletion ---
test('can delete a task', { url: appUrl })
  .step('Find a task in any column')
    .check('Task card is visible')
  .step('Open task actions menu and select delete')
    .check('Delete confirmation dialog appears')
  .step('Confirm deletion')
    .check('Task is removed from the board')
    .check('Task no longer appears in any column') 