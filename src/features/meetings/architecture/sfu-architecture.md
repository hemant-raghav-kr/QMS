# QMS Video & Audio Architecture: Selective Forwarding Unit (SFU) Specification

## 1. Overview & Rationale

For internal meetings in Quartzite Management System (QMS), we select a **Selective Forwarding Unit (SFU)** topology (using an engine such as LiveKit or Mediasoup) over a naive peer-to-peer mesh.

### Why SFU instead of P2P Mesh?
- In a full mesh system, each participant must upload their audio and video streams to every other participant ($N-1$ uplinks, $N(N-1)$ total connections). With 6+ participants, typical client bandwidth and CPU become saturated, causing dropped frames, audio stutter, and mobile device overheating.
- With an SFU architecture:
  - Each participant uploads their media streams **exactly once** to the SFU server.
  - The SFU routes individual downstream tracks (simulcast layers: high, medium, low) to other clients according to viewport size and available bandwidth.
  - Bandwidth consumption on the client scales linearly $O(1)$ upstream and $O(N)$ downstream with automatic degradation.

---

## 2. Infrastructure Diagram

```
+-------------------------------------------------------+
|                    QMS Web App                        |
|  (Audio/Video Controls, Screen Sharing, Chat, State)   |
+-------------------------------------------------------+
                           |
          1. Request room auth token (JWT)
                           v
+-------------------------------------------------------+
|                  QMS Next.js API                      |
|      - Verifies Supabase session                      |
|      - Checks meeting participant permission          |
|      - Generates signed LiveKit/SFU Room Token        |
+-------------------------------------------------------+
                           |
          2. Connect via WebSocket with Token
                           v
+-------------------------------------------------------+
|                   SFU Media Server                    |
|             (LiveKit / Mediasoup cluster)             |
|                                                       |
|   Participant A   Participant B    Participant C     |
|     (Publishes)     (Publishes)      (Publishes)      |
|           \             |            /                |
|            \            |           /                 |
|             +---> Selective Router <---+              |
|                     (Simulcast)                       |
+-------------------------------------------------------+
                           |
          3. Room Webhooks (Participant Joined/Left)
                           v
+-------------------------------------------------------+
|             Supabase Attendance Automation            |
|       - Records joined_at / left_at                   |
|       - Evaluates attendance point rules              |
|       - Generates point transactions                  |
+-------------------------------------------------------+
```

---

## 3. Core Feature Contracts

1. **Room State & Connectivity**:
   - Status: `DISCONNECTED` | `CONNECTING` | `CONNECTED` | `RECONNECTING`
   - Real-time latency and packet-loss stats.

2. **Track Publishing**:
   - `localVideoTrack`: Camera track with simulcast (360p, 720p, 1080p).
   - `localAudioTrack`: Microphone track with automatic noise suppression, echo cancellation, and voice activity detection (VAD).
   - `screenShareTrack`: 1080p 30fps screen share with system audio loopback.

3. **Host Controls & Moderation**:
   - Mute participant track remotely.
   - Lock room.
   - Force participant disconnect.

4. **Integration with QMS Attendance & Points Loop**:
   - `room.participant_joined`: Updates `attendance.joined_at`.
   - `room.participant_left`: Calculates total duration in meeting. If $\ge 80\%$ duration, sets status to `PRESENT`. If joined late $>10$m, sets `LATE`.
   - Auto-triggers `point_transactions` insertion from matching `point_rules`.

5. **Fallback**:
   - When a meeting is flagged as `meeting_type = 'EXTERNAL'`, the client bypasses the internal SFU interface and provides direct one-click access to the configured external provider link.
