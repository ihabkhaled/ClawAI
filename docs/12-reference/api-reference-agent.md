# API Reference: Agent Service

Base URL:

- via Nginx: `http://localhost:4000/api/v1`
- direct: `http://localhost:4015/api/v1`

---

## Sessions

- `POST /agent/sessions`
- `GET /agent/sessions`
- `GET /agent/sessions/:id`
- `DELETE /agent/sessions/:id`
- `POST /agent/sessions/:id/heartbeat`

### Example register request

```json
{
  "hostname": "IHAB-LAPTOP",
  "platform": "windows",
  "agentVersion": "0.1.0"
}
```

---

## Commands

- `POST /agent/commands`
- `GET /agent/commands`
- `GET /agent/commands/pending`
- `GET /agent/commands/:id`
- `POST /agent/commands/:id/approve`
- `POST /agent/commands/:id/reject`
- `POST /agent/commands/:id/complete`

The approval flow is human-in-the-loop:

1. user creates command
2. user approves or rejects it
3. CLI polls pending approved commands
4. CLI reports completion

---

## Repositories

- `POST /agent/repos`
- `GET /agent/repos`
- `GET /agent/repos/:id`
- `PATCH /agent/repos/:id`
- `DELETE /agent/repos/:id`

---

## File Events

- `POST /agent/events`
- `GET /agent/events`

The CLI uses this to report file-system activity from watched local repositories.
