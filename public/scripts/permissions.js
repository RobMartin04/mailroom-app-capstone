// User Permissions Helper
// Manages role-based access control for frontend

let userPermissions = null;

/**
 * Initialize permissions by fetching from the API
 */
async function initializePermissions() {
  try {
    userPermissions = await window.apiClient.getPermissions();
    console.log('User permissions loaded:', userPermissions);
    return userPermissions;
  } catch (error) {
    console.error('Failed to load permissions:', error);
    return null;
  }
}

/**
 * Check if user can perform an action on a resource
 * @param {string} resource - 'packages' or 'recipients'
 * @param {string} action - 'create', 'read', 'update', 'delete'
 */
function canPerformAction(resource, action) {
  if (!userPermissions || !userPermissions[resource]) {
    return false;
  }
  return userPermissions[resource][action] === true;
}

/**
 * Check if user is a worker
 */
function isWorker() {
  return userPermissions?.userType === 'worker';
}

/**
 * Check if user is a student
 */
function isStudent() {
  return userPermissions?.userType === 'student';
}

/**
 * Hide elements that user doesn't have permission to use
 * @param {string} selector - CSS selector for elements to check
 * @param {string} resource - 'packages' or 'recipients'
 * @param {string} action - 'create', 'read', 'update', 'delete'
 */
function hideIfNoPermission(selector, resource, action) {
  if (!canPerformAction(resource, action)) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      el.style.display = 'none';
    });
  }
}

/**
 * Disable elements that user doesn't have permission to use
 * @param {string} selector - CSS selector for elements to check
 * @param {string} resource - 'packages' or 'recipients'
 * @param {string} action - 'create', 'read', 'update', 'delete'
 */
function disableIfNoPermission(selector, resource, action) {
  if (!canPerformAction(resource, action)) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      el.disabled = true;
      el.classList.add('disabled');
      el.title = 'You do not have permission to perform this action';
    });
  }
}

/**
 * Apply permissions to the UI
 * Call this after permissions are loaded
 */
function applyPermissionsToUI() {
  if (!userPermissions) {
    console.warn('Permissions not loaded, skipping UI updates');
    return;
  }

  console.log('Applying permissions to UI for user type:', userPermissions.userType);

  // Students shouldn't see worker-only sections
  if (isStudent()) {
    // Hide scan section for students
    hideIfNoPermission('.scan-section', 'packages', 'create');
    hideIfNoPermission('[data-permission="packages:create"]', 'packages', 'create');
    hideIfNoPermission('[data-permission="packages:update"]', 'packages', 'update');
    hideIfNoPermission('[data-permission="packages:delete"]', 'packages', 'delete');

    // Hide recipients section completely for students
    hideIfNoPermission('.recipients-section', 'recipients', 'read');
    hideIfNoPermission('[data-permission="recipients:create"]', 'recipients', 'create');
    hideIfNoPermission('[data-permission="recipients:update"]', 'recipients', 'update');
    hideIfNoPermission('[data-permission="recipients:delete"]', 'recipients', 'delete');
  }
}

// Export functions
window.permissions = {
  initialize: initializePermissions,
  canPerformAction,
  isWorker,
  isStudent,
  hideIfNoPermission,
  disableIfNoPermission,
  applyPermissionsToUI,
  get: () => userPermissions
};
