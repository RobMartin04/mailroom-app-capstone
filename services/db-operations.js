/**
 * Database Operations Module
 * Handles all CRUD operations for the UNA Package Tracker
 */

import { query } from './database.js';

// ==================== USER OPERATIONS ====================

/**
 * Get user by username
 * @param {string} username
 * @returns {Promise<Object|null>}
 */
export async function getUserByUsername(username) {
  const result = await query(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );
  return result.rows[0] || null;
}

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
export async function getUserByEmail(email) {
  const result = await query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

/**
 * Get user by L number
 * @param {string} lNumber
 * @returns {Promise<Object|null>}
 */
export async function getUserByLNumber(lNumber) {
  const result = await query(
    'SELECT * FROM users WHERE l_number = $1',
    [lNumber]
  );
  return result.rows[0] || null;
}

/**
 * Create new user
 * @param {Object} userData
 * @returns {Promise<Object>}
 */
export async function createUser(userData) {
  const { username, passwordHash, type, email, fullName, lNumber } = userData;

  const result = await query(
    `INSERT INTO users (username, password_hash, type, email, full_name, l_number)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [username, passwordHash, type, email, fullName, lNumber]
  );

  return result.rows[0];
}

// ==================== RECIPIENT OPERATIONS ====================

/**
 * Get all recipients
 * @returns {Promise<Array>}
 */
export async function getAllRecipients() {
  const result = await query(
    'SELECT * FROM recipients ORDER BY name ASC'
  );
  return result.rows;
}

/**
 * Get recipient by ID
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
export async function getRecipientById(id) {
  const result = await query(
    'SELECT * FROM recipients WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get recipient by L number
 * @param {string} lNumber
 * @returns {Promise<Object|null>}
 */
export async function getRecipientByLNumber(lNumber) {
  const result = await query(
    'SELECT * FROM recipients WHERE l_number = $1',
    [lNumber]
  );
  return result.rows[0] || null;
}

/**
 * Create new recipient
 * @param {Object} recipientData
 * @returns {Promise<Object>}
 */
export async function createRecipient(recipientData) {
  const { name, lNumber, type, mailbox, email } = recipientData;

  const result = await query(
    `INSERT INTO recipients (name, l_number, type, mailbox, email)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, lNumber, type, mailbox, email]
  );

  return result.rows[0];
}

/**
 * Update recipient
 * @param {number} id
 * @param {Object} recipientData
 * @returns {Promise<Object|null>}
 */
export async function updateRecipient(id, recipientData) {
  const { name, lNumber, type, mailbox, email } = recipientData;

  const result = await query(
    `UPDATE recipients
     SET name = $1, l_number = $2, type = $3, mailbox = $4, email = $5
     WHERE id = $6
     RETURNING *`,
    [name, lNumber, type, mailbox, email, id]
  );

  return result.rows[0] || null;
}

/**
 * Delete recipient
 * @param {number} id
 * @returns {Promise<boolean>}
 */
export async function deleteRecipient(id) {
  const result = await query(
    'DELETE FROM recipients WHERE id = $1',
    [id]
  );
  return result.rowCount > 0;
}

// ==================== PACKAGE OPERATIONS ====================

/**
 * Get all packages
 * @returns {Promise<Array>}
 */
export async function getAllPackages() {
  const result = await query(
    `SELECT * FROM packages
     ORDER BY check_in_date DESC`
  );
  return result.rows;
}

/**
 * Get packages by L number (for students to view their packages)
 * @param {string} lNumber
 * @returns {Promise<Array>}
 */
export async function getPackagesByLNumber(lNumber) {
  const result = await query(
    `SELECT * FROM packages
     WHERE l_number = $1
     ORDER BY check_in_date DESC`,
    [lNumber]
  );
  return result.rows;
}

/**
 * Get package by ID
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
export async function getPackageById(id) {
  const result = await query(
    'SELECT * FROM packages WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get package by tracking code
 * @param {string} trackingCode
 * @returns {Promise<Object|null>}
 */
export async function getPackageByTrackingCode(trackingCode) {
  const result = await query(
    'SELECT * FROM packages WHERE tracking_code = $1',
    [trackingCode]
  );
  return result.rows[0] || null;
}

/**
 * Create new package (check-in)
 * @param {Object} packageData
 * @returns {Promise<Object>}
 */
export async function createPackage(packageData) {
  const {
    trackingCode,
    carrier,
    recipientId,
    recipientName,
    lNumber,
    mailbox,
    carrierStatus,
    serviceType,
    expectedDelivery,
    lastLocation,
    carrierData
  } = packageData;

  const result = await query(
    `INSERT INTO packages (
      tracking_code, carrier, recipient_id, recipient_name,
      l_number, mailbox, carrier_status, service_type,
      expected_delivery, last_location, last_updated, carrier_data
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)
    RETURNING *`,
    [
      trackingCode,
      carrier,
      recipientId,
      recipientName,
      lNumber,
      mailbox,
      carrierStatus,
      serviceType,
      expectedDelivery,
      lastLocation,
      JSON.stringify(carrierData || {})
    ]
  );

  return result.rows[0];
}

/**
 * Update package
 * @param {number} id
 * @param {Object} packageData
 * @returns {Promise<Object|null>}
 */
export async function updatePackage(id, packageData) {
  const {
    trackingCode,
    carrier,
    status,
    recipientId,
    recipientName,
    lNumber,
    mailbox,
    carrierStatus,
    serviceType,
    expectedDelivery,
    lastLocation,
    carrierData
  } = packageData;

  const result = await query(
    `UPDATE packages
     SET tracking_code = COALESCE($1, tracking_code),
         carrier = COALESCE($2, carrier),
         status = COALESCE($3, status),
         recipient_id = COALESCE($4, recipient_id),
         recipient_name = COALESCE($5, recipient_name),
         l_number = COALESCE($6, l_number),
         mailbox = COALESCE($7, mailbox),
         carrier_status = COALESCE($8, carrier_status),
         service_type = COALESCE($9, service_type),
         expected_delivery = COALESCE($10, expected_delivery),
         last_location = COALESCE($11, last_location),
         carrier_data = COALESCE($12, carrier_data),
         last_updated = NOW()
     WHERE id = $13
     RETURNING *`,
    [
      trackingCode,
      carrier,
      status,
      recipientId,
      recipientName,
      lNumber,
      mailbox,
      carrierStatus,
      serviceType,
      expectedDelivery,
      lastLocation,
      carrierData ? JSON.stringify(carrierData) : null,
      id
    ]
  );

  return result.rows[0] || null;
}

/**
 * Check out package (mark as picked up)
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
export async function checkoutPackage(id) {
  const result = await query(
    `UPDATE packages
     SET status = 'Picked Up', checkout_date = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  return result.rows[0] || null;
}

/**
 * Delete package
 * @param {number} id
 * @returns {Promise<boolean>}
 */
export async function deletePackage(id) {
  const result = await query(
    'DELETE FROM packages WHERE id = $1',
    [id]
  );
  return result.rowCount > 0;
}

/**
 * Get package statistics
 * @returns {Promise<Object>}
 */
export async function getPackageStats() {
  const result = await query(`
    SELECT
      COUNT(*) as total_packages,
      COUNT(CASE WHEN status = 'Checked In' THEN 1 END) as checked_in,
      COUNT(CASE WHEN status = 'Picked Up' THEN 1 END) as picked_up,
      COUNT(DISTINCT carrier) as unique_carriers,
      COUNT(DISTINCT l_number) as unique_recipients
    FROM packages
  `);

  return result.rows[0];
}

// ==================== AUDIT LOG OPERATIONS ====================

/**
 * Log an audit event
 * @param {Object} auditData
 * @returns {Promise<Object>}
 */
export async function logAuditEvent(auditData) {
  const { userId, action, entityType, entityId, details } = auditData;

  const result = await query(
    `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, action, entityType, entityId, details]
  );

  return result.rows[0];
}

/**
 * Get audit logs
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getAuditLogs(limit = 100) {
  const result = await query(
    `SELECT al.*, u.username, u.type as user_type
     FROM audit_log al
     LEFT JOIN users u ON al.user_id = u.id
     ORDER BY al.created_at DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}

export default {
  // Users
  getUserByUsername,
  getUserByEmail,
  getUserByLNumber,
  createUser,

  // Recipients
  getAllRecipients,
  getRecipientById,
  getRecipientByLNumber,
  createRecipient,
  updateRecipient,
  deleteRecipient,

  // Packages
  getAllPackages,
  getPackagesByLNumber,
  getPackageById,
  getPackageByTrackingCode,
  createPackage,
  updatePackage,
  checkoutPackage,
  deletePackage,
  getPackageStats,

  // Audit
  logAuditEvent,
  getAuditLogs
};
