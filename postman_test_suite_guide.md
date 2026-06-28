# Attendance Module - Postman Test Suite Guide

This guide describes the **120 test cases** organized across **12 testing categories** (10 test cases per category). 

To ensure thorough coverage, every single testing category contains a balanced distribution of:
* **Positive Test Cases** (TC-XX-01 to TC-XX-04): Valid inputs, happy path validation.
* **Negative Test Cases** (TC-XX-05 to TC-XX-07): Malformed inputs, error response verification.
* **Boundary Test Cases** (TC-XX-08 to TC-XX-10): Edge conditions, limits, offsets, and out-of-bounds checks.

State is managed cleanly at the request-level using Pre-request scripts with the pre-seeded student `11723210018`.

---

## 1. Functional Testing
| Test ID | Case Type | Request & Objective | Expected Status |
| :--- | :--- | :--- | :--- |
| **TC-FUNC-01** | Positive | `POST /attendance/mark` - Mark PRESENT status | `201 Created` |
| **TC-FUNC-02** | Positive | `POST /attendance/mark` - Mark ABSENT status | `201 Created` |
| **TC-FUNC-03** | Positive | `POST /attendance/mark` - Mark LATE status | `201 Created` |
| **TC-FUNC-04** | Positive | `PUT /attendance/:id` - Update status by faculty | `200 OK` |
| **TC-FUNC-05** | Negative | `POST /attendance/mark` - Missing required fields | `400 Bad Request` |
| **TC-FUNC-06** | Negative | `PUT /attendance/non-existent-id` - Update non-existent record | `400 Bad Request` |
| **TC-FUNC-07** | Negative | `PUT /attendance/:id` - Update with invalid status value | `400 Bad Request` |
| **TC-FUNC-08** | Boundary | `POST /attendance/mark` - Mark on exact current date limit | `201 Created` |
| **TC-FUNC-09** | Boundary | `POST /attendance/mark` - Mark on historic past date boundary | `201 Created` |
| **TC-FUNC-10** | Boundary | `GET /attendance/threshold?threshold=100` - Query 100% boundary | `200 OK` |

---

## 2. API Testing
| Test ID | Case Type | Request & Objective | Expected Status |
| :--- | :--- | :--- | :--- |
| **TC-API-01** | Positive | `GET /attendance/summary` - Get summary with filters | `200 OK` |
| **TC-API-02** | Positive | `GET /attendance/student/:id` - Pagination (limit/offset) | `200 OK` |
| **TC-API-03** | Positive | `GET /attendance/course/:id?limit=10` - Course limits | `200 OK` |
| **TC-API-04** | Positive | `GET /attendance/percentage` - Valid student calculation | `200 OK` |
| **TC-API-05** | Negative | `GET /attendance/student/:id?startDate=bad-date` - Bad date format | `400 Bad Request` |
| **TC-API-06** | Negative | `GET /attendance/percentage` - Missing required query fields | `400 Bad Request` |
| **TC-API-07** | Negative | `GET /attendance/threshold?threshold=-10` - Negative percentage | `400 Bad Request` |
| **TC-API-08** | Boundary | `GET /attendance/summary?courseId=&batchId=` - Empty query filters | `200 OK` |
| **TC-API-09** | Boundary | `POST /attendance/mark` - Mark with future date boundary | `400 Bad Request` |
| **TC-API-10** | Boundary | `GET /attendance/student/:id?offset=0` - Limit offset bounds | `200 OK` |

---

## 3. Security Testing
| Test ID | Case Type | Request & Objective | Expected Status |
| :--- | :--- | :--- | :--- |
| **TC-SEC-01** | Positive | `POST /attendance/mark` - Faculty role authorized check | `201 Created` |
| **TC-SEC-02** | Positive | `GET /attendance/summary` - Admin role authorized check | `200 OK` |
| **TC-SEC-03** | Positive | `GET /attendance/summary` - Super Admin authorized check | `200 OK` |
| **TC-SEC-04** | Positive | `GET /attendance/student/:id` - Student authorized for self details | `200 OK` |
| **TC-SEC-05** | Negative | `GET /attendance/summary` - No authorization header block | `401 Unauthorized` |
| **TC-SEC-06** | Negative | `POST /attendance/mark` - Student role blocked from marking | `403 Forbidden` |
| **TC-SEC-07** | Negative | `GET /attendance/student/:id` - Student blocked other student (IDOR) | `403 Forbidden` |
| **TC-SEC-08** | Boundary | `POST /attendance/mark` - Tenant Isolation cross-university reject | `403 Forbidden` |
| **TC-SEC-09** | Boundary | `GET /attendance/summary` - Invalid role (GUEST) reject | `403 Forbidden` |
| **TC-SEC-10** | Boundary | `GET /attendance/student/:SQLInjectionPayload` - Injection sanitize | `200 / 400 (Handled)` |

---

## 4. Performance Testing
| Test ID | Case Type | Request & Objective | Expected Latency |
| :--- | :--- | :--- | :--- |
| **TC-PERF-01** | Positive | `POST /attendance/mark` - Mark attendance write response | `< 50ms` |
| **TC-PERF-02** | Positive | `GET /attendance/summary` - Fetch summary read response | `< 100ms` |
| **TC-PERF-03** | Positive | `GET /attendance/student/:id` - Fetch student read response | `< 80ms` |
| **TC-PERF-04** | Positive | `GET /attendance/course/:id` - Fetch course read response | `< 80ms` |
| **TC-PERF-05** | Negative | `POST /attendance/mark` - Fail validation body response | `< 30ms` |
| **TC-PERF-06** | Negative | `GET /attendance/summary` - Unauthorized access block response | `< 30ms` |
| **TC-PERF-07** | Negative | `PUT /attendance/non-existent-id` - Non-existent ID response | `< 50ms` |
| **TC-PERF-08** | Boundary | `GET /attendance/summary` - Latency under rapid consecutive calls | `< 100ms` |
| **TC-PERF-09** | Boundary | `POST /attendance/reset-db` - Database reset operation | `< 150ms` |
| **TC-PERF-10** | Boundary | `GET /attendance/percentage` - Analytics computation query | `< 80ms` |

---

## 5. Vulnerability Testing
| Test ID | Case Type | Request & Objective | Expected Status |
| :--- | :--- | :--- | :--- |
| **TC-VULN-01** | Positive | `PUT /attendance/:id` - Update with standard safe comments | `200 OK` |
| **TC-VULN-02** | Positive | `GET /attendance/student/:id` - Normal lookup alphanumeric string | `200 OK` |
| **TC-VULN-03** | Positive | `GET /attendance/student/:id` - Standard query date bounds | `200 OK` |
| **TC-VULN-04** | Positive | `GET /attendance/summary` - Normal auth token validation check | `200 OK` |
| **TC-VULN-05** | Negative | `POST /attendance/mark` - JSON injection block in Enum field | `400 Bad Request` |
| **TC-VULN-06** | Negative | `POST /attendance/mark` - DoS oversized payload | `400 / 413 (Blocked)` |
| **TC-VULN-07** | Negative | `PUT /attendance/:id` - Stored XSS injection in reason | `200/400/500 (Safe)` |
| **TC-VULN-08** | Boundary | `GET /attendance/student/../../` - Path traversal attempt | `404 / 400 (Blocked)` |
| **TC-VULN-09** | Boundary | `GET /attendance/student/...` - SQL Injection payload in dates | `200 / 400 (Handled)` |
| **TC-VULN-10** | Boundary | `GET /attendance/percentage` - HTTP Parameter Pollution checks | `200 OK (Handled)` |

---

## 6. Compatibility Testing
| Test ID | Case Type | Request & Objective | Expected Status |
| :--- | :--- | :--- | :--- |
| **TC-COMP-01** | Positive | `POST /attendance/mark` - Standard JSON encoding | `201 Created` |
| **TC-COMP-02** | Positive | `GET /attendance/summary` - Gzip `Accept-Encoding` check | `200 OK` |
| **TC-COMP-03** | Positive | `GET /attendance/summary` - Web Browser `User-Agent` support | `200 OK` |
| **TC-COMP-04** | Positive | `POST /attendance/mark` - Status case conversion ("present") | `201 Created` |
| **TC-COMP-05** | Negative | `POST /attendance/mark` - Reject XML payloads | `400 Bad Request` |
| **TC-COMP-06** | Negative | `POST /attendance/mark` - Reject HTML payloads | `400 Bad Request` |
| **TC-COMP-07** | Negative | `POST /attendance/mark` - Reject urlencoded payloads | `400 Bad Request` |
| **TC-COMP-08** | Boundary | `GET /attendance/summary` - CORS Preflight validation header | `200 OK` |
| **TC-COMP-09** | Boundary | `GET /attendance/summary` - TCP Keep-Alive persistent connection | `200 OK` |
| **TC-COMP-10** | Boundary | `POST /attendance/mark` - Reject multipart/form-data payload | `400 Bad Request` |

---

## 7. Database Testing
| Test ID | Case Type | Request & Objective | Expected Status |
| :--- | :--- | :--- | :--- |
| **TC-DB-01** | Positive | `POST /attendance/mark` - Verify state written to DB | `201 Created` |
| **TC-DB-02** | Positive | `PUT /attendance/:id` - Verify update value persists in DB | `200 OK` |
| **TC-DB-03** | Positive | `PUT /attendance/:id` - Verify DB updates create audit trace | `200 OK` |
| **TC-DB-04** | Positive | `GET /attendance/summary` - Query valid DB count aggregation | `200 OK` |
| **TC-DB-05** | Negative | `GET /attendance/student/:id?offset=abc` - Non-numeric offset | `200 OK (Handled)` |
| **TC-DB-06** | Negative | `GET /attendance/student/:id?limit=xyz` - Non-numeric limit | `200 OK (Handled)` |
| **TC-DB-07** | Negative | `GET /attendance/course/CS9999` - Lookup non-existent course | `200 OK (Empty array)` |
| **TC-DB-08** | Boundary | `GET /attendance/student/:id?startDate=2000-01-01` - Out of bounds | `200 OK (Empty array)` |
| **TC-DB-09** | Boundary | `POST /attendance/reset-db` - Reset all table records verification | `200 OK` |
| **TC-DB-10** | Boundary | `GET /attendance/batch/BATCH999` - Lookup non-existent batch | `200 OK (Empty array)` |

---

## 8. Regression Testing
| Test ID | Case Type | Request & Objective | Expected Status |
| :--- | :--- | :--- | :--- |
| **TC-REGR-01** | Positive | `POST /attendance/mark` - Default date used when omitted | `201 Created` |
| **TC-REGR-02** | Positive | `GET /attendance/threshold` - Faculty/Admin threshold access | `200 OK` |
| **TC-REGR-03** | Positive | `GET /attendance/percentage` - Default percentage output to 0.0 | `200 OK` |
| **TC-REGR-04** | Positive | `POST /attendance/mark` - Trim reason whitespaces | `201 Created` |
| **TC-REGR-05** | Negative | `POST /attendance/mark` - Re-verify future dates are blocked | `400 Bad Request` |
| **TC-REGR-06** | Negative | `POST /attendance/mark` - Re-verify Student role cannot mark | `403 Forbidden` |
| **TC-REGR-07** | Negative | `GET /attendance/student/:id` - Re-verify student IDOR blocked | `403 Forbidden` |
| **TC-REGR-08** | Boundary | `POST /attendance/mark` - Double entry duplicate checks | `400 Bad Request` |
| **TC-REGR-09** | Boundary | `GET /attendance/student/:id?limit=-5` - Negative limit handling | `200 OK (Defaults)` |
| **TC-REGR-10** | Boundary | `GET /attendance/student/:id?offset=-10` - Negative offset handling | `200 OK (Defaults)` |

---

## 9. Data Validation Testing
| Test ID | Case Type | Request & Objective | Expected Status |
| :--- | :--- | :--- | :--- |
| **TC-VAL-01** | Positive | `POST /attendance/mark` - Full valid payload parsing | `201 Created` |
| **TC-VAL-02** | Positive | `POST /attendance/mark` - Convert casing of status value | `201 Created` |
| **TC-VAL-03** | Positive | `POST /attendance/mark` - Ignore extra payload parameter keys | `201 Created` |
| **TC-VAL-04** | Positive | `PUT /attendance/:id` - Support extremely long string updates | `200 OK` |
| **TC-VAL-05** | Negative | `POST /attendance/mark` - Rejection of empty POST bodies | `400 Bad Request` |
| **TC-VAL-06** | Negative | `PUT /attendance/:id` - Rejection of empty status update | `400 Bad Request` |
| **TC-VAL-07** | Negative | `POST /attendance/mark` - Rejection of numeric type student ID | `400 Bad Request` |
| **TC-VAL-08** | Boundary | `PUT /attendance/invalid-uuid` - Malformed UUID path checks | `400 / 500 (Blocked)` |
| **TC-VAL-09** | Boundary | `GET /attendance/threshold?threshold=abc` - Non-numeric threshold | `400 Bad Request` |
| **TC-VAL-10** | Boundary | `POST /attendance/mark` - Reject malformed date strings | `400 / 500 (Blocked)` |

---

## 10. AI/ML Prompt Validation Testing
| Test ID | Case Type | Request & Objective | Expected Status |
| :--- | :--- | :--- | :--- |
| **TC-AI-01** | Positive | `POST /attendance/mark` - Parse conversational datetimes | `201 Created` |
| **TC-AI-02** | Positive | `GET /attendance/summary` - Parse partial query string filters | `200 OK` |
| **TC-AI-03** | Positive | `GET /attendance/summary` - Parse AI request trace headers | `200 OK` |
| **TC-AI-04** | Positive | `POST /attendance/mark` - Ignore AI confidence tags safely | `201 Created` |
| **TC-AI-05** | Negative | `POST /attendance/mark` - Reject trailing comma syntax JSON | `400 Bad Request` |
| **TC-AI-06** | Negative | `PUT /attendance/:id` - Stored Prompt Injection string checks | `200 OK (Literal)` |
| **TC-AI-07** | Negative | `POST /attendance/mark` - Reject invalid conversational dates | `400 / 500 (Blocked)` |
| **TC-AI-08** | Boundary | `GET /attendance/percentage?studentId=...` - Shorthand mapping | `200 OK` |
| **TC-AI-09** | Boundary | `GET /attendance/summary` - Validate AI agent client header | `200 OK` |
| **TC-AI-10** | Boundary | `GET /attendance/summary` - Verify metadata formatting | `200 OK` |

---

## 11. Cloud Testing
| Test ID | Case Type | Request & Objective | Expected Status |
| :--- | :--- | :--- | :--- |
| **TC-CLOUD-01** | Positive | `GET /attendance/summary` - Service ping check | `200 OK` |
| **TC-CLOUD-02** | Positive | `GET /attendance/summary` - Gateway IP forwarding check | `200 OK` |
| **TC-CLOUD-03** | Positive | `GET /attendance/summary` - Gateway AWS trace ID check | `200 OK` |
| **TC-CLOUD-04** | Positive | `GET /attendance/summary` - API Gateway rate limits check | `200 OK` |
| **TC-CLOUD-05** | Negative | `GET /attendance/summary` - Handle mismatched host headers | `200 OK` |
| **TC-CLOUD-06** | Negative | `GET /attendance/summary` - Balancer Keep-Alive timeout bounds | `200 OK` |
| **TC-CLOUD-07** | Negative | `GET /attendance/summary` - Balancer connection closure mock | `200 OK` |
| **TC-CLOUD-08** | Boundary | `GET /attendance/summary` - Cloud media download headers check | `200 OK` |
| **TC-CLOUD-09** | Boundary | `GET /attendance/summary` - Accept v1 version header check | `200 OK` |
| **TC-CLOUD-10** | Boundary | `GET /attendance/summary` - Response cloud headers completeness | `200 OK` |

---

## 12. Usability Testing
| Test ID | Case Type | Request & Objective | Expected Status |
| :--- | :--- | :--- | :--- |
| **TC-USE-01** | Positive | `GET /attendance/summary` - Check success key property | `200 OK` |
| **TC-USE-02** | Positive | `GET /attendance/student/:id` - camelCase JSON properties format | `200 OK` |
| **TC-USE-03** | Positive | `GET /attendance/student/:id` - Standard ISO datetime format | `200 OK` |
| **TC-USE-04** | Positive | `POST /attendance/reset-db` - Clean reset confirmation text | `200 OK` |
| **TC-USE-05** | Negative | `POST /attendance/mark` - Helpful missing student ID message | `400 Bad Request` |
| **TC-USE-06** | Negative | `POST /attendance/mark` - Helpful missing schedule ID message | `400 Bad Request` |
| **TC-USE-07** | Negative | `POST /attendance/mark` - Helpful duplicate record error text | `400 Bad Request` |
| **TC-USE-08** | Boundary | `GET /attendance/invalid` - User-friendly 404 feedback message | `404 Not Found` |
| **TC-USE-09** | Boundary | `GET /attendance/student/` - Usability child resource 404 details | `404 Not Found` |
| **TC-USE-10** | Boundary | `GET /attendance/student/...` - Uniform schema formatting check | `404 Not Found` |
