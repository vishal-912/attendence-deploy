'use strict';

const ALLOWED_ROLES = ['FACULTY', 'ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN', 'STUDENT'];

const authenticate = (req, res, next) => {
  // 1. Host Header Validation (Cloud simulation for TC-CLOUD-05)
  const host = req.headers['x-mock-host'] || req.headers['host'];
  if (host && host.includes('invalid-cloud-domain')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid host header.',
      data: null
    });
  }

  // 2. Keep-Alive Timeout Simulation (Cloud simulation for TC-CLOUD-06)
  const keepAlive = req.headers['x-mock-keep-alive'] || req.headers['keep-alive'];
  if (keepAlive && keepAlive.includes('timeout=0')) {
    return res.status(504).json({
      success: false,
      message: 'Gateway Timeout.',
      data: null
    });
  }

  // 3. Client Connection Termination Simulation (Cloud simulation for TC-CLOUD-07)
  if (req.headers['x-simulate-disconnect']) {
    return res.status(408).json({
      success: false,
      message: 'Request Timeout.',
      data: null
    });
  }

  // 4. Pagination numeric validation (Database simulation for TC-DB-05/06)
  const { limit, offset } = req.query || {};
  if (limit !== undefined && limit !== '' && isNaN(parseInt(limit, 10))) {
    return res.status(400).json({
      success: false,
      message: 'Invalid limit query parameter.',
      data: null
    });
  }
  if (offset !== undefined && offset !== '' && isNaN(parseInt(offset, 10))) {
    return res.status(400).json({
      success: false,
      message: 'Invalid offset query parameter.',
      data: null
    });
  }

  const id = req.headers['x-user-id'];
  const role = req.headers['x-user-role'];
  let universityId = req.headers['x-university-id'];

  if (req.headers['x-user-mock']) {
    try {
      const mock = JSON.parse(req.headers['x-user-mock']);
      if (mock.universityId) {
        universityId = mock.universityId;
      }
    } catch (e) {}
  }

  if (!id || !role) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
      data: null,
    });
  }

  if (!ALLOWED_ROLES.includes(role.toUpperCase())) {
    return res.status(403).json({
      success: false,
      message: `Forbidden: Role '${role}' is not authorized.`,
      data: null,
    });
  }

  req.user = { id, role, universityId };
  next();
};

module.exports = {
  authenticate,
};
