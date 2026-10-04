# QMS Mobile Client & Cross-Platform LiveKit Architecture

## 1. Executive Summary

Quartzite Management System (QMS) uses a WebRTC Selective Forwarding Unit (SFU) architecture powered by LiveKit. This architecture is designed to support both web applications and native mobile applications (React Native / Flutter / iOS / Android) without altering backend schemas, authentication contracts, or media session APIs.

---

## 2. Shared Cross-Platform Core

Both Web and Mobile clients consume the exact same backend infrastructure:

### 2.1. Authentication & Identity
- **Provider**: Supabase Auth (JWT).
- **Identity Model**: `user.id` (UUID) serves as the canonical participant identity across Supabase, LiveKit tokens, database attendance records, and presence channels.
- **Display Metadata**: `name`, `role`, and `isHost` are embedded in the LiveKit token metadata and Supabase presence state.

### 2.2. Room Identification
- **Room Name**: The Supabase `meetings.id` (UUID) is directly used as the LiveKit room name.
- **Guarantees**: Ensures one-to-one mapping between database meeting records, LiveKit SFU active rooms, and Supabase Realtime broadcast channels (`meeting-room:${meetingId}`).

### 2.3. Server Token API
- **Endpoint**: `GET /api/meetings/[id]/token`
- **Response Schema**:
  ```json
  {
    "token": "<JWT_ACCESS_TOKEN>",
    "url": "wss://<livekit-instance>.livekit.cloud",
    "livekitConfigured": true,
    "user": {
      "id": "uuid",
      "name": "Member Name",
      "isHost": false,
      "role": "MEMBER"
    }
  }
  ```
- **Grants**: Standard LiveKit VideoGrants (`roomJoin: true`, `room: meetingId`, `canPublish: true`, `canSubscribe: true`, `canPublishData: true`). Compatible with all LiveKit native client SDKs (`@livekit/react-native`, `livekit-client-swift`, `livekit-client-kotlin`, `livekit-client-flutter`).

### 2.4. Attendance & Session Lifecycle
- **Session Tracking**: `startAttendanceSession(meetingId, userId, sessionId)` and `endAttendanceSession(sessionId)` are REST/RPC compatible and can be called directly by mobile clients on room join and room leave/disconnect.
- **Meeting Conclusion**: `POST /api/meetings/[id]/end` finalizes attendance records, attendance sessions, and triggers final report metrics.

---

## 3. Media Pipeline: Web vs. Native Mobile Mapping

The table below documents how web-specific browser APIs map to native mobile equivalents:

| Functional Area | Web Implementation | Native Mobile Implementation (React Native / Native) |
| :--- | :--- | :--- |
| **Media Transport** | `livekit-client` (WebRTC in browser) | `@livekit/react-native` / native LiveKit SDK |
| **Audio Playback** | Global `<audio>` elements via `track.attach()` into DOM container | Handled natively by WebRTC AudioTrack & mobile OS audio subsystem |
| **Audio Routing** | `room.switchActiveDevice('audiooutput', deviceId)` (`setSinkId`) | `InCallManager.setSpeakerphoneOn(true/false)` or `AudioManager` |
| **Autoplay Policy** | Browser autoplay policy / `room.startAudio()` / user gesture | Not applicable on mobile (no browser autoplay restriction); requires audio focus |
| **Microphone / Camera** | `room.localParticipant.setMicrophoneEnabled(bool)` / `setCameraEnabled(bool)` | Identical API in `@livekit/react-native`: `localParticipant.setMicrophoneEnabled(bool)` |
| **Permissions** | `navigator.mediaDevices.getUserMedia()` | Android `RECORD_AUDIO`, `CAMERA` runtime permission; iOS `NSMicrophoneUsageDescription`, `NSCameraUsageDescription` |
| **Video Rendering** | HTML `<video>` element with `srcObject = new MediaStream([track])` | `<RTCView streamURL={track.toURL()} />` or native `<VideoTrackView>` |
| **Screen Sharing** | `navigator.mediaDevices.getDisplayMedia()` | Android `MediaProjection` service; iOS `Broadcast Upload Extension` / ReplayKit |
| **Background Audio** | Page Visibility API (browsers may throttle background tabs) | Foreground Service (Android) / Audio Background Mode (iOS) with CallKeep / ConnectionService |

---

## 4. Key Architectural Safeguards Enforced

1. **No Browser-Only Assumption in Schema**:
   The database schema (`meetings`, `meeting_participants`, `meeting_attendance_sessions`, `attendance`) contains zero browser-specific fields.
2. **Unified MediaProvider Interface**:
   The `MediaProvider` contract (`connect`, `disconnect`, `setMicrophoneEnabled`, `setCameraEnabled`, `switchCamera`, `switchMicrophone`, `switchSpeaker`, `startAudio`) provides an abstraction layer that can be implemented by a `NativeMediaProvider` using `@livekit/react-native` with 100% UI component compatibility.
3. **Immutable Attendance & Audit Tracking**:
   Attendance duration and leave timestamps are logged server-side, ensuring mobile participants are held to the exact same attendance and point rules as web attendees.
