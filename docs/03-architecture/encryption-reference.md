# Encryption Reference

## Overview

ClawAI encrypts sensitive data at rest using AES-256-GCM. The primary use case is cloud provider API keys stored by the connector-service. This document covers the encryption scheme, key management, and rotation procedures.

---

## AES-256-GCM Encryption

### Algorithm Properties

| Property | Value |
| --- | --- |
| Algorithm | AES-256-GCM (Galois/Counter Mode) |
| Key Size | 256 bits (64 hex characters) |
| IV Size | 12 bytes (96 bits), randomly generated per encryption |
| Auth Tag Size | 16 bytes (128 bits) |
| Confidentiality | AES-256 provides 256-bit symmetric encryption |
| Integrity | GCM auth tag detects any tampering with ciphertext |
| Uniqueness | Random IV per encryption ensures identical plaintexts produce different ciphertexts |

### Encryption Flow

```
Plaintext API Key
      |
      v
Generate random 12-byte IV
      |
      v
Encrypt with AES-256-GCM:
  Key:       ENCRYPTION_KEY (from environment variable, 64 hex chars)
  IV:        Random 12 bytes
  Plaintext: API key string
  Output:    Ciphertext + 16-byte AuthTag
      |
      v
Encode:  base64(IV || Ciphertext || AuthTag)
      |
      v
Store in database as `encryptedConfig` field
```

### Decryption Flow

```
Read encryptedConfig from database
      |
      v
Decode base64 -> binary buffer
      |
      v
Extract components:
  IV:         First 12 bytes
  AuthTag:    Last 16 bytes
  Ciphertext: Everything between
      |
      v
Decrypt with AES-256-GCM:
  Key:        ENCRYPTION_KEY
  IV:         Extracted IV
  Ciphertext: Extracted ciphertext
  AuthTag:    Extracted auth tag
      |
      v
Plaintext API key (used immediately, not stored)
```

---

## Key Management

### ENCRYPTION_KEY

| Property | Detail |
| --- | --- |
| Format | 64 hexadecimal characters (256 bits) |
| Storage | `.env` file at repository root |
| Access | Only connector-service reads this value |
| Generation | `openssl rand -hex 32` or equivalent |
| Version Control | Never committed (`.env` is in `.gitignore`) |

### Key Access Pattern

```
.env file (ENCRYPTION_KEY=<64 hex chars>)
      |
      v
AppConfig (Zod-validated at service startup)
      |
      v
connector-service (only service that uses ENCRYPTION_KEY)
      |
      v
Encrypt on write: when creating/updating a connector
Decrypt on read:  when making API calls to cloud providers
```

### Key Storage Rules

1. ENCRYPTION_KEY is loaded from environment variables only
2. Never hardcoded in source code
3. Never logged (Pino redaction covers `secret` and `encryptedConfig` fields)
4. Never exposed in API responses
5. Never shared between services (only connector-service needs it)
6. Never committed to version control

---

## Key Rotation Procedure

### When to Rotate

- Suspected key compromise
- Personnel changes (team member with key access departs)
- Compliance policy (e.g., annual rotation)
- After a security incident

### Rotation Steps

1. **Generate new key**:
   ```bash
   openssl rand -hex 32
   ```

2. **Run migration script** (must be created):
   - Read all connectors with encrypted configs
   - Decrypt each config with the OLD key
   - Re-encrypt each config with the NEW key
   - Update database records in a transaction

3. **Update environment**:
   - Set new `ENCRYPTION_KEY` in `.env`
   - Update `scripts/install.sh` and `scripts/install.ps1` if the key is templated

4. **Restart connector-service**:
   ```bash
   docker compose -f docker-compose.dev.yml restart connector-service
   ```

5. **Verify**: Test a connector connection to confirm decryption works with the new key.

### Rollback

If the rotation fails mid-process:
- The transaction should be rolled back (all connectors keep old encryption)
- Revert `ENCRYPTION_KEY` to the old value
- Restart connector-service

---

## What Is Encrypted

| Data | Location | Encryption |
| --- | --- | --- |
| Cloud provider API keys | `Connector.encryptedConfig` | AES-256-GCM |
| Base URLs (if sensitive) | Part of `encryptedConfig` | AES-256-GCM |

### What Is NOT Encrypted (but Protected)

| Data | Protection Method |
| --- | --- |
| User passwords | argon2id hashing (one-way, not decryptable) |
| JWT tokens | Signed with HMAC-SHA256 (integrity, not confidentiality) |
| Database credentials | Environment variables, Docker network isolation |
| RabbitMQ credentials | Environment variables, Docker network isolation |

---

## Security Analysis

### Threat: Database Breach

If an attacker gains read access to the `claw_connectors` PostgreSQL database:
- They see `encryptedConfig` values (base64 encoded ciphertext)
- Without `ENCRYPTION_KEY`, ciphertext is computationally infeasible to decrypt (AES-256)
- The auth tag prevents modification without detection

### Threat: Environment Variable Leak

If `ENCRYPTION_KEY` is leaked but database is not compromised:
- Key alone is useless without the encrypted data
- Rotate key immediately as a precaution

### Threat: Both Compromised

If both database and `ENCRYPTION_KEY` are compromised:
- Attacker can decrypt all API keys
- Immediate action: revoke all cloud provider API keys at the provider level
- Generate new API keys and new ENCRYPTION_KEY
- Re-encrypt with new key

### Residual Risk

The primary residual risk is that ENCRYPTION_KEY and database access are co-located on the same machine in the current Docker Compose deployment. For production hardening, consider:
- External secrets manager (HashiCorp Vault, AWS Secrets Manager)
- Managed database with separate access controls
- Hardware Security Module (HSM) for key storage
